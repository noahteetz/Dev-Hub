package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.dto.ContentArchiveRequest;
import com.devhub.backend.dto.ContentAssignmentRequest;
import com.devhub.backend.dto.InboxCaptureRequest;
import com.devhub.backend.dto.ProjectArchiveRequest;
import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.exception.ConflictException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.ContentEntry;
import com.devhub.backend.model.ContentType;
import com.devhub.backend.model.Project;
import com.devhub.backend.service.GlobalContentService;
import com.devhub.backend.service.ProjectService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GlobalContentIntegrationTests {
	@Autowired GlobalContentService content;
	@Autowired ProjectService projects;

	@Test void capturesAndAssignsEveryContentTypeWithoutLosingTags() {
		Project project = projects.create(new ProjectRequest("Target", "", "", "", List.of()));
		for (ContentType type : ContentType.values()) {
			ContentEntry captured = content.capture(new InboxCaptureRequest(type, type + " entry", "Body", List.of("phase-3"), "", "java"));
			assertThat(captured.projectId()).isNull();
			assertThat(captured.tags()).extracting(tag -> tag.name()).containsExactly("phase-3");
			ContentEntry assigned = content.assign(type, captured.id(), new ContentAssignmentRequest(project.id()));
			assertThat(assigned.projectId()).isEqualTo(project.id());
			assertThat(assigned.filedAt()).isNotNull();
			assertThat(content.assign(type, captured.id(), new ContentAssignmentRequest(project.id())).filedAt()).isEqualTo(assigned.filedAt());
			ContentEntry returned = content.assign(type, captured.id(), new ContentAssignmentRequest(null));
			assertThat(returned.projectId()).isNull();
			assertThat(returned.filedAt()).isNull();
		}
	}

	@Test void filtersTagsAndUpdatesContentWithoutLosingItsAssignment() {
		ContentEntry first = content.capture(new InboxCaptureRequest(ContentType.NOTE, "First", "Old", List.of("java", "docs"), "", ""));
		content.capture(new InboxCaptureRequest(ContentType.NOTE, "Second", "Other", List.of("docs"), "", ""));
		assertThat(content.findAll(ContentType.NOTE, "inbox", null, false, null, List.of("java"), null, "title", 20, 0)).extracting(ContentEntry::title).containsExactly("First");
		ContentEntry updated = content.update(ContentType.NOTE, first.id(), new InboxCaptureRequest(ContentType.NOTE, "First updated", "New", List.of("updated"), "https://example.com", ""));
		assertThat(updated.title()).isEqualTo("First updated");
		assertThat(updated.sourceUrl()).isEqualTo("https://example.com");
		assertThat(updated.tags()).extracting(tag -> tag.name()).containsExactly("updated");
	}

	@Test void archivesContentAndMarksAssignmentsToArchivedProjects() {
		ContentEntry note = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Reference", "", List.of(), "https://example.com", ""));
		assertThat(content.archive(ContentType.NOTE, note.id(), new ContentArchiveRequest(true)).archived()).isTrue();
		Project project = projects.create(new ProjectRequest("Archive", "", "", "", List.of()));
		projects.archive(project.id(), new ProjectArchiveRequest("done"));
		assertThat(content.assign(ContentType.NOTE, note.id(), new ContentAssignmentRequest(project.id())).projectArchived()).isTrue();
		assertThatThrownBy(() -> content.assign(ContentType.NOTE, note.id(), new ContentAssignmentRequest(999999L))).isInstanceOf(ResourceNotFoundException.class);
	}

	@Test void promotesAnInboxEntryExactlyOnce() {
		ContentEntry idea = content.capture(new InboxCaptureRequest(ContentType.IDEA, "New project", "Description", List.of("seed"), "", ""));
		Project promoted = content.promote(ContentType.IDEA, idea.id());
		assertThat(promoted.name()).isEqualTo("New project");
		assertThat(content.findAll(ContentType.IDEA, "project", promoted.id(), null, null)).singleElement().satisfies(entry -> {
			assertThat(entry.content()).isEqualTo("Description");
			assertThat(entry.tags()).hasSize(1);
		});
		assertThatThrownBy(() -> content.promote(ContentType.IDEA, idea.id())).isInstanceOf(ConflictException.class);
	}
}
