package de.noahteetz.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.noahteetz.backend.dto.ContentArchiveRequest;
import de.noahteetz.backend.dto.ContentAssignmentRequest;
import de.noahteetz.backend.dto.EntityReferenceRequest;
import de.noahteetz.backend.dto.InboxCaptureRequest;
import de.noahteetz.backend.dto.ProjectRequest;
import de.noahteetz.backend.exception.InvalidRequestException;
import de.noahteetz.backend.exception.ResourceNotFoundException;
import de.noahteetz.backend.model.ContentEntry;
import de.noahteetz.backend.model.ContentType;
import de.noahteetz.backend.model.EntityReference;
import de.noahteetz.backend.model.EntityType;
import de.noahteetz.backend.model.Project;
import de.noahteetz.backend.service.EntityReferenceService;
import de.noahteetz.backend.service.GlobalContentService;
import de.noahteetz.backend.service.ProjectService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EntityReferenceIntegrationTests {

	@Autowired EntityReferenceService references;
	@Autowired GlobalContentService content;
	@Autowired ProjectService projects;

	@Test void linksTwoEntriesAndShowsTheLinkFromBothSides() {
		ContentEntry note = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Deployment steps", "See snippet", List.of(), "", ""));
		ContentEntry snippet = content.capture(new InboxCaptureRequest(ContentType.SNIPPET, "Deploy command", "npm run build", List.of(), "", "bash"));

		EntityReference reference = references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.SNIPPET, snippet.id()));

		assertThat(reference.targetTitle()).isEqualTo("Deploy command");
		assertThat(reference.targetUrl()).isEqualTo("/snippets/" + snippet.id());
		assertThat(references.outgoing(EntityType.NOTE, note.id())).extracting(EntityReference::targetId).containsExactly(snippet.id());
		assertThat(references.incoming(EntityType.SNIPPET, snippet.id())).extracting(EntityReference::sourceTitle).containsExactly("Deployment steps");
		assertThat(references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.SNIPPET, snippet.id())).id())
				.isEqualTo(reference.id());
	}

	@Test void rejectsSelfReferencesAndUnknownEntries() {
		ContentEntry note = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Alone", "", List.of(), "", ""));

		assertThatThrownBy(() -> references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.NOTE, note.id())))
				.isInstanceOf(InvalidRequestException.class);
		assertThatThrownBy(() -> references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.IDEA, 999999L)))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test void dropsTheLinkWhenTheTargetIsDeletedButKeepsTheSourceText() {
		ContentEntry note = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Keeps its text", "Body stays", List.of(), "", ""));
		ContentEntry idea = content.capture(new InboxCaptureRequest(ContentType.IDEA, "Short lived", "", List.of(), "", ""));
		references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.IDEA, idea.id()));

		content.delete(ContentType.IDEA, idea.id());

		assertThat(references.outgoing(EntityType.NOTE, note.id())).isEmpty();
		assertThat(content.find(ContentType.NOTE, note.id()).content()).isEqualTo("Body stays");
	}

	@Test void survivesAssignmentPromotionAndArchiving() {
		ContentEntry note = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Travels well", "", List.of(), "", ""));
		ContentEntry idea = content.capture(new InboxCaptureRequest(ContentType.IDEA, "Becomes a project", "Description", List.of(), "", ""));
		references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.IDEA, idea.id()));

		Project target = projects.create(new ProjectRequest("Target", "", "", "", List.of()));
		content.assign(ContentType.NOTE, note.id(), new ContentAssignmentRequest(target.id()));
		content.promote(ContentType.IDEA, idea.id());
		content.archive(ContentType.NOTE, note.id(), new ContentArchiveRequest(true));

		assertThat(references.outgoing(EntityType.NOTE, note.id())).extracting(EntityReference::targetId).containsExactly(idea.id());
		assertThat(references.incoming(EntityType.IDEA, idea.id())).hasSize(1);
	}

	@Test void deletesASingleReferenceOnRequest() {
		ContentEntry note = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Source", "", List.of(), "", ""));
		ContentEntry todo = content.capture(new InboxCaptureRequest(ContentType.TODO, "Target", "", List.of(), "", ""));
		EntityReference reference = references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.TODO, todo.id()));

		references.delete(reference.id());

		assertThat(references.outgoing(EntityType.NOTE, note.id())).isEmpty();
		assertThatThrownBy(() -> references.delete(reference.id())).isInstanceOf(ResourceNotFoundException.class);
	}
}
