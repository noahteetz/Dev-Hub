package com.devhub.backend;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.assertj.core.api.Assertions.assertThat;

import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.RepositoryConnection;
import com.devhub.backend.model.RepositoryMetadata;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositorySyncStatus;
import com.devhub.backend.service.ProjectService;
import com.devhub.backend.service.RepositoryMetadataService;
import com.github.tomakehurst.wiremock.WireMockServer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
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
 * Provider responses are simulated with WireMock. These tests never call the real
 * GitHub or GitLab endpoints.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RepositoryMetadataIntegrationTests {

	private static final WireMockServer PROVIDER = new WireMockServer(options().dynamicPort());

	static {
		PROVIDER.start();
	}

	private final ProjectService projectService;
	private final RepositoryMetadataService repositoryMetadataService;

	@Autowired
	RepositoryMetadataIntegrationTests(
			ProjectService projectService,
			RepositoryMetadataService repositoryMetadataService
	) {
		this.projectService = projectService;
		this.repositoryMetadataService = repositoryMetadataService;
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
	void readsGitHubMetadataFromSimulatedResponses() {
		stubGitHubRepository();
		Project project = createProject("https://github.com/octocat/Hello-World");

		RepositoryMetadata metadata = refreshMetadata(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.READY);
		assertThat(metadata.provider()).isEqualTo(RepositoryProvider.GITHUB);
		assertThat(metadata.defaultBranch()).isEqualTo("main");
		assertThat(metadata.lastCommitSha()).isEqualTo("2f5c81a");
		assertThat(metadata.lastCommitMessage()).isEqualTo("Add the resume context");
		assertThat(metadata.lastCommitAuthor()).isEqualTo("Ada Lovelace");
		assertThat(metadata.lastCommitAt()).isEqualTo(Instant.parse("2026-08-30T09:15:00Z"));
		assertThat(metadata.languages()).containsEntry("Java", 75.0).containsEntry("TypeScript", 25.0);
		assertThat(metadata.readmeFileName()).isEqualTo("README.md");
		assertThat(metadata.readmeContent()).isEqualTo("# Hello World");
		assertThat(metadata.branchesUrl()).isEqualTo("https://github.com/octocat/Hello-World/branches");
		assertThat(metadata.issuesUrl()).isEqualTo("https://github.com/octocat/Hello-World/issues");
		assertThat(metadata.pullRequestsUrl()).isEqualTo("https://github.com/octocat/Hello-World/pulls");
		assertThat(metadata.errorCode()).isEmpty();
		assertThat(metadata.lastSuccessfulSyncAt()).isNotNull();
	}

	@Test
	void readsGitLabMetadataFromSimulatedResponses() {
		stubGitLabRepository();
		Project project = createProject("https://gitlab.com/group/tooling");

		RepositoryMetadata metadata = refreshMetadata(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.READY);
		assertThat(metadata.provider()).isEqualTo(RepositoryProvider.GITLAB);
		assertThat(metadata.defaultBranch()).isEqualTo("trunk");
		assertThat(metadata.lastCommitSha()).isEqualTo("9a1b2c3");
		assertThat(metadata.lastCommitMessage()).isEqualTo("Wire up the dashboard");
		assertThat(metadata.lastCommitAuthor()).isEqualTo("Grace Hopper");
		assertThat(metadata.lastCommitAt()).isEqualTo(Instant.parse("2026-08-28T18:00:00Z"));
		assertThat(metadata.languages()).containsEntry("Kotlin", 60.0).containsEntry("CSS", 40.0);
		assertThat(metadata.readmeContent()).isEqualTo("# Tooling");
		assertThat(metadata.branchesUrl()).isEqualTo("https://gitlab.com/group/tooling/-/branches");
		assertThat(metadata.issuesUrl()).isEqualTo("https://gitlab.com/group/tooling/-/issues");
		assertThat(metadata.pullRequestsUrl()).isEqualTo("https://gitlab.com/group/tooling/-/merge_requests");
	}

	@Test
	void reportsAMissingRepositoryAsPrivateOrNotFoundAndKeepsTheLastSuccessfulCache() {
		stubGitHubRepository();
		Project project = createProject("https://github.com/octocat/Hello-World");
		RepositoryMetadata successful = refreshMetadata(project);

		PROVIDER.resetAll();
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/Hello-World"))
				.willReturn(aResponse().withStatus(404).withBody("{\"message\":\"Not Found\"}")));

		RepositoryMetadata failed = refreshMetadata(project);

		assertThat(failed.syncStatus()).isEqualTo(RepositorySyncStatus.PRIVATE_OR_NOT_FOUND);
		assertThat(failed.errorCode()).isEqualTo("HTTP_404");
		assertThat(failed.errorMessage()).contains("private");
		assertThat(failed.lastCommitSha()).isEqualTo(successful.lastCommitSha());
		assertThat(failed.readmeContent()).isEqualTo(successful.readmeContent());
		assertThat(failed.languages()).isEqualTo(successful.languages());
		assertThat(failed.lastSuccessfulSyncAt()).isEqualTo(successful.lastSuccessfulSyncAt());
	}

	@Test
	void reportsAProviderRateLimit() {
		Project project = createProject("https://github.com/octocat/Hello-World");
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/Hello-World"))
				.willReturn(aResponse().withStatus(429).withBody("{\"message\":\"rate limit\"}")));

		RepositoryMetadata metadata = refreshMetadata(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.RATE_LIMITED);
		assertThat(metadata.errorCode()).isEqualTo("HTTP_429");
		assertThat(metadata.errorMessage()).contains("rate limit");
	}

	@Test
	void reportsAnUnexpectedProviderErrorAsFailed() {
		Project project = createProject("https://github.com/octocat/Hello-World");
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/Hello-World"))
				.willReturn(aResponse().withStatus(500)));

		RepositoryMetadata metadata = refreshMetadata(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.FAILED);
		assertThat(metadata.errorCode()).isEqualTo("HTTP_500");
	}

	@Test
	void marksAGenericGitHostAsUnsupportedWithoutCallingAnyProvider() {
		Project project = createProject("https://git.example.com/group/tooling.git");

		RepositoryMetadata metadata = refreshMetadata(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.UNSUPPORTED);
		assertThat(metadata.errorCode()).isEqualTo("UNSUPPORTED");
		assertThat(PROVIDER.getAllServeEvents()).isEmpty();
	}

	@Test
	void keepsTheReadmeEmptyWhenTheRepositoryHasNone() {
		stubGitHubRepository();
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/Hello-World/readme"))
				.willReturn(aResponse().withStatus(404).withBody("{\"message\":\"Not Found\"}")));
		Project project = createProject("https://github.com/octocat/Hello-World");

		RepositoryMetadata metadata = refreshMetadata(project);

		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.READY);
		assertThat(metadata.readmeFileName()).isEmpty();
		assertThat(metadata.readmeContent()).isEmpty();
	}

	private Project createProject(String repositoryUrl) {
		return projectService.create(new ProjectRequest(
				"Repository project",
				"Connected to a simulated provider",
				repositoryUrl,
				"",
				List.of()
		));
	}

	private RepositoryMetadata refreshMetadata(Project project) {
		RepositoryConnection connection = repositoryMetadataService.refresh(project.id());
		assertThat(connection.metadata()).isNotNull();
		return connection.metadata();
	}

	private void stubGitHubRepository() {
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/Hello-World"))
				.willReturn(okJson("""
						{
							"default_branch": "main",
							"html_url": "https://github.com/octocat/Hello-World"
						}
						""")));
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/Hello-World/commits/main"))
				.willReturn(okJson("""
						{
							"sha": "2f5c81a",
							"commit": {
								"message": "Add the resume context",
								"author": { "name": "Ada Lovelace", "date": "2026-08-30T09:15:00Z" }
							}
						}
						""")));
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/Hello-World/languages"))
				.willReturn(okJson("{ \"Java\": 750, \"TypeScript\": 250 }")));
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/Hello-World/readme"))
				.willReturn(okJson("""
						{
							"name": "README.md",
							"content": "%s"
						}
						""".formatted(base64("# Hello World")))));
	}

	private void stubGitLabRepository() {
		PROVIDER.stubFor(get(urlPathEqualTo("/api/v4/projects/group%2Ftooling"))
				.willReturn(okJson("""
						{
							"default_branch": "trunk",
							"web_url": "https://gitlab.com/group/tooling"
						}
						""")));
		PROVIDER.stubFor(get(urlPathEqualTo("/api/v4/projects/group%2Ftooling/repository/commits"))
				.willReturn(okJson("""
						[
							{
								"id": "9a1b2c3",
								"title": "Wire up the dashboard",
								"author_name": "Grace Hopper",
								"committed_date": "2026-08-28T18:00:00Z"
							}
						]
						""")));
		PROVIDER.stubFor(get(urlPathEqualTo("/api/v4/projects/group%2Ftooling/languages"))
				.willReturn(okJson("{ \"Kotlin\": 60, \"CSS\": 40 }")));
		PROVIDER.stubFor(get(urlPathEqualTo("/api/v4/projects/group%2Ftooling/repository/files/README.md"))
				.willReturn(okJson("""
						{
							"file_name": "README.md",
							"content": "%s"
						}
						""".formatted(base64("# Tooling")))));
	}

	private static String base64(String value) {
		return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
	}
}
