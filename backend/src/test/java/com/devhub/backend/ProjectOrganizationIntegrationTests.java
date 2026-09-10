package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.devhub.backend.dto.ProjectArchiveRequest;
import com.devhub.backend.dto.ProjectContextRequest;
import com.devhub.backend.dto.ProjectOrganizationRequest;
import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.ProjectStatus;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryReference;
import com.devhub.backend.model.RepositorySnapshot;
import com.devhub.backend.repository.RepositoryMetadataRepository;
import com.devhub.backend.service.ProjectService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ProjectOrganizationIntegrationTests {

	private final ProjectService projectService;
	private final RepositoryMetadataRepository repositoryMetadataRepository;

	@Autowired
	ProjectOrganizationIntegrationTests(
			ProjectService projectService,
			RepositoryMetadataRepository repositoryMetadataRepository
	) {
		this.projectService = projectService;
		this.repositoryMetadataRepository = repositoryMetadataRepository;
	}

	@Test
	void organizesProjectAndRestoresItsPreviousStatusAfterArchive() {
		Project created = projectService.create(new ProjectRequest(
				"Context project",
				"Track the next session",
				"",
				"",
				List.of()
		));

		Project organized = projectService.updateOrganization(
				created.id(),
				new ProjectOrganizationRequest(ProjectStatus.ACTIVE, 3, true)
		);
		Project withContext = projectService.updateContext(
				created.id(),
				new ProjectContextRequest(
						"The core flow is implemented.",
						"Add the first integration test.",
						"Waiting for API credentials.",
						"./gradlew bootRun",
						"./gradlew test",
						"Use explicit JDBC repositories."
				)
		);

		assertThat(organized.status()).isEqualTo(ProjectStatus.ACTIVE);
		assertThat(organized.priority()).isEqualTo(3);
		assertThat(organized.favorite()).isTrue();
		assertThat(withContext.nextStep()).isEqualTo("Add the first integration test.");
		assertThat(withContext.contextUpdatedAt()).isNotNull();

		Project archived = projectService.archive(
				created.id(),
				new ProjectArchiveRequest("Work shipped")
		);

		assertThat(archived.status()).isEqualTo(ProjectStatus.ARCHIVED);
		assertThat(archived.statusBeforeArchive()).isEqualTo(ProjectStatus.ACTIVE);
		assertThat(archived.archiveReason()).isEqualTo("Work shipped");
		assertThat(projectService.findAll(false)).extracting(Project::id).doesNotContain(created.id());
		assertThat(projectService.findAll(true)).extracting(Project::id).contains(created.id());

		Project restored = projectService.restore(created.id());

		assertThat(restored.status()).isEqualTo(ProjectStatus.ACTIVE);
		assertThat(restored.statusBeforeArchive()).isNull();
		assertThat(restored.archivedAt()).isNull();
		assertThat(restored.nextStep()).isEqualTo("Add the first integration test.");
	}

	@Test
	void invalidatesRepositorySnapshotWhenProjectRepositoryChanges() {
		Project created = projectService.create(new ProjectRequest(
				"Repository project",
				"",
				"https://github.com/example/old-repository",
				"",
				List.of()
		));
		RepositoryReference reference = new RepositoryReference(
				RepositoryProvider.GITHUB,
				"example",
				"old-repository",
				"https://github.com/example/old-repository"
		);
		repositoryMetadataRepository.saveSuccess(
				created.id(),
				reference,
				new RepositorySnapshot(
						"main",
						"abc123",
						"Initial commit",
						"Dev Hub",
						Instant.parse("2026-01-01T10:00:00Z"),
						"README.md",
						"# Old repository",
						Map.of("Java", 100.0),
						"https://github.com/example/old-repository/branches",
						"https://github.com/example/old-repository/issues",
						"https://github.com/example/old-repository/pulls"
				)
		);

		assertThat(repositoryMetadataRepository.findByProjectId(created.id()))
				.get()
				.extracting(metadata -> metadata.lastCommitSha())
				.isEqualTo("abc123");

		projectService.update(created.id(), new ProjectRequest(
				"Repository project",
				"",
				"https://github.com/example/new-repository",
				"",
				List.of()
		));

		assertThat(repositoryMetadataRepository.findByProjectId(created.id())).isEmpty();
	}
}