package com.devhub.backend;

import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.dto.GitCredentialRequest;
import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.dto.RepositoryImportRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.RemoteRepository;
import com.devhub.backend.model.RepositoryOwner;
import com.devhub.backend.model.RepositoryOwnerType;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.service.GitCredentialService;
import com.devhub.backend.service.ProjectService;
import com.devhub.backend.service.RepositoryDiscoveryService;
import com.devhub.backend.service.RepositoryImportService;
import com.github.tomakehurst.wiremock.WireMockServer;
import java.time.Instant;
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

/** Listing the repositories a token can reach, and turning a selection into projects. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RepositoryDiscoveryIntegrationTests {

	private static final String TOKEN = "ghp_discovery_token";
	private static final WireMockServer PROVIDER = new WireMockServer(options().dynamicPort());

	static {
		PROVIDER.start();
	}

	private final GitCredentialService credentialService;
	private final RepositoryDiscoveryService discoveryService;
	private final RepositoryImportService importService;
	private final ProjectService projectService;

	@Autowired
	RepositoryDiscoveryIntegrationTests(
			GitCredentialService credentialService,
			RepositoryDiscoveryService discoveryService,
			RepositoryImportService importService,
			ProjectService projectService
	) {
		this.credentialService = credentialService;
		this.discoveryService = discoveryService;
		this.importService = importService;
		this.projectService = projectService;
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
	void reset() {
		PROVIDER.resetAll();
		discoveryService.invalidate(RepositoryProvider.GITHUB);
		discoveryService.invalidate(RepositoryProvider.GITLAB);
	}

	@Test
	void listsPrivateAndOrganizationRepositoriesNewestFirst() {
		connect();
		stubRepositoryList();

		List<RemoteRepository> repositories = discoveryService.list(RepositoryProvider.GITHUB, "", "");

		assertThat(repositories).extracting(RemoteRepository::fullName)
				.containsExactly("octocat/vibe-thing", "acme/internal-tooling", "octocat/public-demo");
		assertThat(repositories.get(0).privateRepository()).isTrue();
		assertThat(repositories.get(0).lastActivityAt()).isEqualTo(Instant.parse("2026-09-05T10:00:00Z"));
		assertThat(repositories.get(2).privateRepository()).isFalse();
		PROVIDER.verify(getRequestedFor(urlPathEqualTo("/user/repos")));
	}

	@Test
	void filtersByTermAndByOwner() {
		connect();
		stubRepositoryList();

		assertThat(discoveryService.list(RepositoryProvider.GITHUB, "tooling", ""))
				.extracting(RemoteRepository::fullName)
				.containsExactly("acme/internal-tooling");
		assertThat(discoveryService.list(RepositoryProvider.GITHUB, "", "acme"))
				.extracting(RemoteRepository::fullName)
				.containsExactly("acme/internal-tooling");
		// The description is searched as well, so a repository is findable by what it does.
		assertThat(discoveryService.list(RepositoryProvider.GITHUB, "weekend", ""))
				.extracting(RemoteRepository::fullName)
				.containsExactly("octocat/vibe-thing");
	}

	@Test
	void separatesTheOwnAccountFromOrganizations() {
		connect();
		stubRepositoryList();

		List<RepositoryOwner> owners = discoveryService.owners(RepositoryProvider.GITHUB);

		assertThat(owners).extracting(RepositoryOwner::login).containsExactly("octocat", "acme");
		assertThat(owners.get(0).type()).isEqualTo(RepositoryOwnerType.USER);
		assertThat(owners.get(0).repositoryCount()).isEqualTo(2);
		assertThat(owners.get(1).type()).isEqualTo(RepositoryOwnerType.ORGANIZATION);
	}

	@Test
	void answersRepeatedFilteringFromTheCacheInsteadOfCallingTheProviderAgain() {
		connect();
		stubRepositoryList();

		discoveryService.list(RepositoryProvider.GITHUB, "", "");
		discoveryService.list(RepositoryProvider.GITHUB, "vibe", "");
		discoveryService.list(RepositoryProvider.GITHUB, "", "acme");

		PROVIDER.verify(1, getRequestedFor(urlPathEqualTo("/user/repos")));
	}

	@Test
	void dropsTheCachedListingWhenTheTokenIsRemoved() {
		connect();
		stubRepositoryList();
		assertThat(discoveryService.list(RepositoryProvider.GITHUB, "", "")).isNotEmpty();

		credentialService.delete(RepositoryProvider.GITHUB);

		assertThatThrownBy(() -> discoveryService.list(RepositoryProvider.GITHUB, "", ""))
				.isInstanceOf(InvalidRequestException.class)
				.hasMessageContaining("No token is stored");
	}

	@Test
	void asksForATokenBeforeListingAnything() {
		assertThatThrownBy(() -> discoveryService.list(RepositoryProvider.GITHUB, "", ""))
				.isInstanceOf(InvalidRequestException.class)
				.hasMessageContaining("settings");
		assertThat(PROVIDER.getAllServeEvents()).isEmpty();
	}

	@Test
	void createsOneProjectPerSelectedRepository() {
		connect();
		stubRepositoryList();

		RepositoryImportService.ImportResult result = importService.importRepositories(new RepositoryImportRequest(
				RepositoryProvider.GITHUB,
				List.of("octocat/vibe-thing", "acme/internal-tooling")
		));

		assertThat(result.created()).extracting(Project::name)
				.containsExactly("vibe-thing", "internal-tooling");
		assertThat(result.created()).extracting(Project::repositoryUrl)
				.containsExactly("https://github.com/octocat/vibe-thing", "https://github.com/acme/internal-tooling");
		assertThat(result.created().get(0).description()).isEqualTo("A weekend experiment");
		assertThat(result.skipped()).isEmpty();
	}

	@Test
	void skipsRepositoriesThatAreAlreadyConnectedOrNotVisible() {
		connect();
		stubRepositoryList();
		projectService.create(new ProjectRequest(
				"Already here",
				"",
				"https://github.com/octocat/vibe-thing.git",
				"",
				List.of()
		));

		RepositoryImportService.ImportResult result = importService.importRepositories(new RepositoryImportRequest(
				RepositoryProvider.GITHUB,
				List.of("octocat/vibe-thing", "someone/not-in-my-account", "acme/internal-tooling")
		));

		assertThat(result.created()).extracting(Project::name).containsExactly("internal-tooling");
		assertThat(result.skipped()).containsExactly("octocat/vibe-thing", "someone/not-in-my-account");
	}

	@Test
	void refusesAnEmptySelection() {
		assertThatThrownBy(() -> importService.importRepositories(
				new RepositoryImportRequest(RepositoryProvider.GITHUB, List.of())
		)).isInstanceOf(InvalidRequestException.class).hasMessageContaining("at least one");
	}

	private void connect() {
		PROVIDER.stubFor(get(urlPathEqualTo("/user")).willReturn(okJson("{ \"login\": \"octocat\" }")
				.withHeader("x-oauth-scopes", "repo, read:org")));
		credentialService.save(RepositoryProvider.GITHUB, new GitCredentialRequest("Private", TOKEN));
	}

	private void stubRepositoryList() {
		PROVIDER.stubFor(get(urlPathEqualTo("/user/repos")).willReturn(okJson("""
				[
					{
						"full_name": "octocat/public-demo",
						"name": "public-demo",
						"description": "Public sample",
						"private": false,
						"archived": false,
						"default_branch": "main",
						"pushed_at": "2026-07-01T09:00:00Z",
						"language": "TypeScript",
						"html_url": "https://github.com/octocat/public-demo"
					},
					{
						"full_name": "octocat/vibe-thing",
						"name": "vibe-thing",
						"description": "A weekend experiment",
						"private": true,
						"archived": false,
						"default_branch": "main",
						"pushed_at": "2026-09-05T10:00:00Z",
						"language": "Java",
						"html_url": "https://github.com/octocat/vibe-thing"
					},
					{
						"full_name": "acme/internal-tooling",
						"name": "internal-tooling",
						"description": "Org internal",
						"private": true,
						"archived": false,
						"default_branch": "trunk",
						"pushed_at": "2026-08-20T12:00:00Z",
						"language": "Go",
						"html_url": "https://github.com/acme/internal-tooling"
					}
				]
				""")));
	}
}
