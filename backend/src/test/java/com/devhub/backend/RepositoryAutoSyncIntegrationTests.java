package com.devhub.backend;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.assertj.core.api.Assertions.assertThat;

import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.RepositoryMetadata;
import com.devhub.backend.model.RepositorySyncCandidate;
import com.devhub.backend.model.RepositorySyncStatus;
import com.devhub.backend.repository.RepositoryMetadataRepository;
import com.devhub.backend.service.ProjectService;
import com.devhub.backend.service.RepositoryAutoSyncService;
import com.devhub.backend.service.RepositoryMetadataService;
import com.github.tomakehurst.wiremock.WireMockServer;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/**
 * The hourly background sync. The scheduler itself is off in the test profile; every
 * test drives one run directly and WireMock stands in for the provider.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RepositoryAutoSyncIntegrationTests {

	private static final WireMockServer PROVIDER = new WireMockServer(options().dynamicPort());

	static {
		PROVIDER.start();
	}

	private final ProjectService projectService;
	private final RepositoryMetadataService metadataService;
	private final RepositoryMetadataRepository metadataRepository;
	private final RepositoryAutoSyncService autoSyncService;
	private final JdbcTemplate jdbcTemplate;

	@Autowired
	RepositoryAutoSyncIntegrationTests(
			ProjectService projectService,
			RepositoryMetadataService metadataService,
			RepositoryMetadataRepository metadataRepository,
			RepositoryAutoSyncService autoSyncService,
			JdbcTemplate jdbcTemplate
	) {
		this.projectService = projectService;
		this.metadataService = metadataService;
		this.metadataRepository = metadataRepository;
		this.autoSyncService = autoSyncService;
		this.jdbcTemplate = jdbcTemplate;
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
	void startFromAKnownState() {
		PROVIDER.resetAll();
		// A run looks at every project in the database. The rollback puts back whatever
		// another test class left behind.
		jdbcTemplate.update("DELETE FROM projects");
	}

	@Test
	void syncsAProjectThatWasNeverSynced() {
		stubGitHubRepository();
		Project project = createProject("https://github.com/octocat/Hello-World");

		RepositoryAutoSyncService.Run run = autoSyncService.syncDue();

		assertThat(run.considered()).isEqualTo(1);
		assertThat(run.synced()).isEqualTo(1);
		assertThat(run.failed()).isZero();
		RepositoryMetadata metadata = metadata(project);
		assertThat(metadata.syncStatus()).isEqualTo(RepositorySyncStatus.READY);
		assertThat(metadata.lastCommitSha()).isEqualTo("2f5c81a");
		assertThat(metadata.lastCommitAt()).isEqualTo(Instant.parse("2026-08-30T09:15:00Z"));
	}

	@Test
	void leavesARecentlySyncedProjectAlone() {
		stubGitHubRepository();
		Project project = createProject("https://github.com/octocat/Hello-World");
		metadataService.refresh(project.id());
		Instant firstAttempt = metadata(project).lastAttemptAt();
		PROVIDER.resetAll();

		RepositoryAutoSyncService.Run run = autoSyncService.syncDue();

		assertThat(run.considered()).isZero();
		assertThat(metadata(project).lastAttemptAt()).isEqualTo(firstAttempt);
		assertThat(PROVIDER.getAllServeEvents()).isEmpty();
	}

	@Test
	void syncsAProjectAgainOnceItsLastAttemptIsOldEnough() {
		stubGitHubRepository();
		Project project = createProject("https://github.com/octocat/Hello-World");
		metadataService.refresh(project.id());
		backdateLastAttempt(project, Duration.ofHours(2));

		RepositoryAutoSyncService.Run run = autoSyncService.syncDue();

		assertThat(run.synced()).isEqualTo(1);
		assertThat(metadata(project).syncStatus()).isEqualTo(RepositorySyncStatus.READY);
	}

	@Test
	void skipsAnUnsupportedProviderWithoutCallingAnything() {
		Project project = createProject("https://git.example.com/group/tooling.git");

		RepositoryAutoSyncService.Run run = autoSyncService.syncDue();

		assertThat(run.considered()).isEqualTo(1);
		assertThat(run.skipped()).isEqualTo(1);
		assertThat(run.synced()).isZero();
		assertThat(PROVIDER.getAllServeEvents()).isEmpty();
		assertThat(metadataRepository.findByProjectId(project.id())).isEmpty();
	}

	@Test
	void skipsARateLimitedProjectUntilItsQuotaResets() {
		stubGitHubRepository();
		Project project = createProject("https://github.com/octocat/Hello-World");
		metadataService.refresh(project.id());
		backdateLastAttempt(project, Duration.ofHours(2));
		markRateLimited(project, Instant.now().plus(Duration.ofMinutes(30)));
		PROVIDER.resetAll();

		RepositoryAutoSyncService.Run run = autoSyncService.syncDue();

		assertThat(run.skipped()).isEqualTo(1);
		assertThat(run.synced()).isZero();
		assertThat(PROVIDER.getAllServeEvents()).isEmpty();
	}

	@Test
	void syncsTheOtherProjectsWhenOneRepositoryAnswersWithAnError() {
		stubGitHubRepository();
		PROVIDER.stubFor(get(urlPathEqualTo("/repos/octocat/broken"))
				.willReturn(aResponse().withStatus(500)));
		Project broken = createProject("https://github.com/octocat/broken");
		Project healthy = createProject("https://github.com/octocat/Hello-World");

		RepositoryAutoSyncService.Run run = autoSyncService.syncDue();

		assertThat(run.considered()).isEqualTo(2);
		assertThat(metadata(broken).syncStatus()).isEqualTo(RepositorySyncStatus.FAILED);
		assertThat(metadata(healthy).syncStatus()).isEqualTo(RepositorySyncStatus.READY);
	}

	@Test
	void neverOffersArchivedProjectsOrProjectsWithoutARepository() {
		Project archived = createProject("https://github.com/octocat/Hello-World");
		jdbcTemplate.update("UPDATE projects SET status = 'ARCHIVED' WHERE id = ?", archived.id());
		createProject("");
		Project connected = createProject("https://github.com/octocat/Hello-World");

		List<RepositorySyncCandidate> due = metadataRepository.findDueForSync(Instant.now());

		assertThat(due).extracting(RepositorySyncCandidate::projectId).containsExactly(connected.id());
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

	private RepositoryMetadata metadata(Project project) {
		return metadataRepository.findByProjectId(project.id()).orElseThrow();
	}

	private void backdateLastAttempt(Project project, Duration age) {
		jdbcTemplate.update(
				"UPDATE repository_metadata SET last_attempt_at = ? WHERE project_id = ?",
				Timestamp.from(Instant.now().minus(age)),
				project.id()
		);
	}

	private void markRateLimited(Project project, Instant resetAt) {
		jdbcTemplate.update(
				"UPDATE repository_metadata SET sync_status = ?, rate_limit_reset_at = ? WHERE project_id = ?",
				RepositorySyncStatus.RATE_LIMITED.name(),
				Timestamp.from(resetAt),
				project.id()
		);
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

	private static String base64(String value) {
		return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
	}
}
