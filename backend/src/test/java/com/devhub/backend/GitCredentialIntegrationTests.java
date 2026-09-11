package com.devhub.backend;

import static com.github.tomakehurst.wiremock.client.WireMock.absent;
import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.dto.GitCredentialRequest;
import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.GitCredential;
import com.devhub.backend.model.GitCredentialStatus;
import com.devhub.backend.model.GitCredentialView;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.RepositoryMetadata;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositorySyncStatus;
import com.devhub.backend.repository.GitCredentialRepository;
import com.devhub.backend.service.GitCredentialService;
import com.devhub.backend.service.ProjectService;
import com.devhub.backend.service.RepositoryMetadataProvider;
import com.devhub.backend.service.RepositoryMetadataService;
import com.devhub.backend.service.TokenCipher;
import com.github.tomakehurst.wiremock.WireMockServer;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/**
 * Token storage and the difference a token makes when reading a repository. The provider
 * is simulated with WireMock; no real GitHub or GitLab endpoint is contacted.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GitCredentialIntegrationTests {

	private static final String TOKEN = "ghp_simulated_token_value";
	private static final WireMockServer PROVIDER = new WireMockServer(options().dynamicPort());

	static {
		PROVIDER.start();
	}

	private final GitCredentialService credentialService;
	private final GitCredentialRepository credentialRepository;
	private final ProjectService projectService;
	private final RepositoryMetadataService repositoryMetadataService;
	private final List<RepositoryMetadataProvider> providers;

	@Autowired
	GitCredentialIntegrationTests(
			GitCredentialService credentialService,
			GitCredentialRepository credentialRepository,
			ProjectService projectService,
			RepositoryMetadataService repositoryMetadataService,
			List<RepositoryMetadataProvider> providers
	) {
		this.credentialService = credentialService;
		this.credentialRepository = credentialRepository;
		this.projectService = projectService;
		this.repositoryMetadataService = repositoryMetadataService;
		this.providers = providers;
	}

	@DynamicPropertySource
	static void providerBaseUrls(DynamicPropertyRegistry registry) {
		registry.add("devhub.repository.github.base-url", PROVIDER::baseUrl);
		registry.add("devhub.repository.gitlab.base-url", () -> PROVIDER.baseUrl() + "/api/v4");
	}

	@AfterAll
	static void stopProvider() {
		PROVIDER.stop();
	}

	@BeforeEach
	void resetProvider() {
		PROVIDER.resetAll();
	}

	@Test
	void storesTheTokenEncryptedAndAnswersWithoutItsValue() {
		stubUser();

		GitCredentialView view = credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("", TOKEN));

		assertThat(view.accountLogin()).isEqualTo("octocat");
		assertThat(view.scopes()).containsExactly("repo", "read:org");
		assertThat(view.status()).isEqualTo(GitCredentialStatus.VERIFIED);
		assertThat(view.tokenHint()).isEqualTo("alue");
		// The host follows the configured base URL, which the tests point at WireMock.
		assertThat(view.host()).isEqualTo("localhost");
		assertThat(view.lastVerifiedAt()).isNotNull();

		GitCredential stored = credentialRepository.findByProvider(RepositoryProvider.GITHUB).orElseThrow();
		assertThat(stored.tokenEncrypted()).isNotEqualTo(TOKEN).doesNotContain(TOKEN);
		assertThat(credentialService.credentialFor(RepositoryProvider.GITHUB).orElseThrow().token()).isEqualTo(TOKEN);
	}

	@Test
	void sendsTheStoredTokenWhenReadingARepository() {
		stubUser();
		credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("Private", TOKEN));
		stubRepository();
		Project project = createProject();

		RepositoryMetadata metadata = refresh(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.READY);
		PROVIDER.verify(getRequestedFor(urlPathEqualTo("/repos/octocat/private-thing"))
				.withHeader("Authorization", equalTo("Bearer " + TOKEN)));
		PROVIDER.verify(getRequestedFor(urlPathEqualTo("/repos/octocat/private-thing/languages"))
				.withHeader("Authorization", equalTo("Bearer " + TOKEN)));
	}

	@Test
	void readsPublicRepositoriesAnonymouslyWhenNoTokenIsStored() {
		stubRepository();
		Project project = createProject();

		RepositoryMetadata metadata = refresh(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.READY);
		PROVIDER.verify(getRequestedFor(urlPathEqualTo("/repos/octocat/private-thing"))
				.withHeader("Authorization", absent()));
	}

	@Test
	void refusesToStoreATokenTheProviderRejects() {
		PROVIDER.stubFor(get(urlPathEqualTo("/user")).willReturn(aResponse().withStatus(401)));

		assertThatThrownBy(() -> credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("", TOKEN)))
				.isInstanceOf(InvalidRequestException.class)
				.hasMessageContaining("rejected");
		assertThat(credentialRepository.findByProvider(RepositoryProvider.GITHUB)).isEmpty();
	}

	@Test
	void refusesAnEmptyToken() {
		assertThatThrownBy(() -> credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("", "   ")))
				.isInstanceOf(InvalidRequestException.class)
				.hasMessageContaining("Token is required");
		assertThat(credentialRepository.findByProvider(RepositoryProvider.GITHUB)).isEmpty();
	}

	@Test
	void pointsAtTheSettingsWhenAPrivateRepositoryIsReadWithoutAToken() {
		Project project = createProject();
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing")).willReturn(aResponse().withStatus(404)));

		RepositoryMetadata metadata = refresh(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.PRIVATE_OR_NOT_FOUND);
		assertThat(metadata.errorMessage()).contains("GitHub token", "settings");
	}

	@Test
	void reportsARejectedStoredTokenAsAnInvalidCredential() {
		stubUser();
		credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("", TOKEN));
		Project project = createProject();
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing")).willReturn(aResponse().withStatus(401)));

		RepositoryMetadata metadata = refresh(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.CREDENTIAL_INVALID);
		assertThat(metadata.errorMessage()).contains("Update it in the settings");
	}

	@Test
	void separatesAMissingScopeFromAnExhaustedQuota() {
		stubUser();
		credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("", TOKEN));
		Project project = createProject();

		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing")).willReturn(aResponse().withStatus(403)));
		assertThat(refresh(project).syncStatus()).isEqualTo(RepositorySyncStatus.CREDENTIAL_INSUFFICIENT);

		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing")).willReturn(aResponse()
				.withStatus(403)
				.withHeader("x-ratelimit-limit", "5000")
				.withHeader("x-ratelimit-remaining", "0")
				.withHeader("x-ratelimit-reset", "1800000000")));
		RepositoryMetadata limited = refresh(project);

		assertThat(limited.syncStatus()).isEqualTo(RepositorySyncStatus.RATE_LIMITED);
		assertThat(limited.rateLimit().remaining()).isZero();
		assertThat(limited.rateLimit().limit()).isEqualTo(5000);
	}

	@Test
	void keepsTheRemainingQuotaFromASuccessfulRead() {
		stubRepository();
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing")).willReturn(okJson("""
				{ "default_branch": "main", "html_url": "https://github.com/octocat/private-thing" }
				""")
				.withHeader("x-ratelimit-limit", "5000")
				.withHeader("x-ratelimit-remaining", "4997")));
		Project project = createProject();

		RepositoryMetadata metadata = refresh(project);

		assertThat(metadata.rateLimit().remaining()).isEqualTo(4997);
		assertThat(metadata.rateLimit().limit()).isEqualTo(5000);
	}

	@Test
	void marksAStoredTokenUnreadableWhenTheEncryptionKeyChanged() {
		stubUser();
		credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("", TOKEN));

		GitCredentialService afterKeyChange = new GitCredentialService(
				credentialRepository,
				new TokenCipher(Base64.getEncoder().encodeToString(new byte[32])),
				providers
		);

		assertThat(afterKeyChange.credentialFor(RepositoryProvider.GITHUB)).isEmpty();
		assertThat(afterKeyChange.hasCredential(RepositoryProvider.GITHUB)).isTrue();
		GitCredentialView view = afterKeyChange.verify(RepositoryProvider.GITHUB);
		assertThat(view.status()).isEqualTo(GitCredentialStatus.UNREADABLE);
		assertThat(view.lastError()).contains("Enter it again");
	}

	@Test
	void saysWhatIsWrongWhenAStoredTokenCannotBeDecrypted() {
		stubUser();
		credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("", TOKEN));
		credentialRepository.save(
				RepositoryProvider.GITHUB,
				"Broken",
				"github.com",
				"not-a-valid-cipher-text",
				"alue",
				"octocat",
				List.of("repo"),
				GitCredentialStatus.VERIFIED
		);
		Project project = createProject();
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing")).willReturn(aResponse().withStatus(404)));

		RepositoryMetadata metadata = refresh(project);

		assertThat(metadata.errorMessage()).contains("could not be read");
	}

	@Test
	void stopsSendingTheTokenAfterItIsDeleted() {
		stubUser();
		credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("", TOKEN));
		credentialService.delete(RepositoryProvider.GITHUB);
		stubRepository();
		Project project = createProject();

		refresh(project);

		assertThat(credentialService.findAll()).isEmpty();
		PROVIDER.verify(getRequestedFor(urlPathEqualTo("/repos/octocat/private-thing"))
				.withHeader("Authorization", absent()));
	}

	@Test
	void skipsAnUnchangedRepositoryOnTheNextSync() {
		stubRepository();
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing")).willReturn(okJson("""
				{ "default_branch": "main", "html_url": "https://github.com/octocat/private-thing" }
				""").withHeader("ETag", "\"v1\"")));
		Project project = createProject();
		RepositoryMetadata first = refresh(project);
		assertThat(first.etag()).isEqualTo("\"v1\"");

		PROVIDER.resetAll();
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing"))
				.withHeader("If-None-Match", equalTo("\"v1\""))
				.willReturn(aResponse().withStatus(304).withHeader("ETag", "\"v1\"")));

		RepositoryMetadata unchanged = refresh(project);

		assertThat(unchanged.syncStatus()).isEqualTo(RepositorySyncStatus.READY);
		assertThat(unchanged.lastCommitSha()).isEqualTo(first.lastCommitSha());
		assertThat(unchanged.readmeContent()).isEqualTo(first.readmeContent());
		// The commit, language and readme endpoints are not touched at all on an unchanged read.
		assertThat(PROVIDER.getAllServeEvents()).hasSize(1);
	}

	private Project createProject() {
		return projectService.create(new ProjectRequest(
				"Private thing",
				"A repository that is not public",
				"https://github.com/octocat/private-thing",
				"",
				List.of()
		));
	}

	private RepositoryMetadata refresh(Project project) {
		RepositoryMetadata metadata = repositoryMetadataService.refresh(project.id()).metadata();
		assertThat(metadata).isNotNull();
		return metadata;
	}

	private void stubUser() {
		PROVIDER.stubFor(get(urlPathEqualTo("/user")).willReturn(okJson("{ \"login\": \"octocat\" }")
				.withHeader("x-oauth-scopes", "repo, read:org")));
	}

	private void stubRepository() {
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing")).willReturn(okJson("""
				{ "default_branch": "main", "html_url": "https://github.com/octocat/private-thing" }
				""")));
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing/commits/main")).willReturn(okJson("""
				{
					"sha": "abc1234",
					"commit": {
						"message": "Wire up the picker",
						"author": { "name": "Ada Lovelace", "date": "2026-09-01T08:00:00Z" }
					}
				}
				""")));
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing/languages"))
				.willReturn(okJson("{ \"Java\": 800, \"TypeScript\": 200 }")));
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/private-thing/readme")).willReturn(okJson("""
				{ "name": "README.md", "content": "%s" }
				""".formatted(Base64.getEncoder().encodeToString("# Private thing".getBytes(StandardCharsets.UTF_8))))));
	}
}
