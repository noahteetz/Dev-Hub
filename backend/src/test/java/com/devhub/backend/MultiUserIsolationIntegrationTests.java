package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.dto.ContentAssignmentRequest;
import com.devhub.backend.dto.EntityReferenceRequest;
import com.devhub.backend.dto.InboxCaptureRequest;
import com.devhub.backend.dto.NoteRequest;
import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.ContentEntry;
import com.devhub.backend.model.ContentType;
import com.devhub.backend.model.EntityType;
import com.devhub.backend.model.GitCredentialStatus;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.SearchResult;
import com.devhub.backend.model.Tag;
import com.devhub.backend.repository.AppUserRepository;
import com.devhub.backend.repository.GitCredentialRepository;
import com.devhub.backend.security.CurrentUser;
import com.devhub.backend.service.EntityReferenceService;
import com.devhub.backend.service.GitCredentialService;
import com.devhub.backend.service.GlobalContentService;
import com.devhub.backend.service.NoteService;
import com.devhub.backend.service.ProjectService;
import com.devhub.backend.service.SearchService;
import com.devhub.backend.service.TagService;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/** Two accounts side by side: nothing one of them owns may be read or changed by the other. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MultiUserIsolationIntegrationTests {

	@Autowired ProjectService projects;
	@Autowired NoteService notes;
	@Autowired GlobalContentService content;
	@Autowired SearchService search;
	@Autowired TagService tags;
	@Autowired EntityReferenceService references;
	@Autowired GitCredentialService credentials;
	@Autowired GitCredentialRepository credentialRepository;
	@Autowired AppUserRepository users;
	@Autowired CurrentUser currentUser;
	@Autowired JdbcTemplate jdbc;

	private long alice;
	private long bob;

	@BeforeEach
	void twoAccounts() {
		alice = users.resolve("alice-" + UUID.randomUUID(), "alice");
		bob = users.resolve("bob-" + UUID.randomUUID(), "bob");
	}

	@Test
	void aProjectIsInvisibleAndUnchangeableForAnotherUser() {
		Project project = as(alice, () -> projects.create(new ProjectRequest("Alice only", "", "", "", List.of())));
		as(alice, () -> notes.create(project.id(), new NoteRequest("Plan", "Alice's plan")));

		assertThat(as(bob, () -> projects.findAll())).isEmpty();
		assertThatThrownBy(() -> as(bob, () -> projects.findById(project.id())))
				.isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> as(bob, () -> projects.update(project.id(), new ProjectRequest("Taken over", "", "", "", List.of()))))
				.isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> run(bob, () -> projects.delete(project.id())))
				.isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> as(bob, () -> notes.findAll(project.id())))
				.isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> as(bob, () -> notes.create(project.id(), new NoteRequest("Intruder", "text"))))
				.isInstanceOf(ResourceNotFoundException.class);

		assertThat(as(alice, () -> projects.findById(project.id())).name()).isEqualTo("Alice only");
		assertThat(as(alice, () -> notes.findAll(project.id()))).hasSize(1);
	}

	@Test
	void inboxEntriesTagsAndSearchHitsStayWithTheirOwner() {
		ContentEntry note = as(alice, () -> content.capture(
				new InboxCaptureRequest(ContentType.NOTE, "Alice secret note", "hidden body", List.of("private"), "", "")));

		assertThat(as(bob, () -> content.findAll(ContentType.NOTE, "all", null, null, null))).isEmpty();
		assertThatThrownBy(() -> as(bob, () -> content.find(ContentType.NOTE, note.id())))
				.isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> run(bob, () -> content.delete(ContentType.NOTE, note.id())))
				.isInstanceOf(ResourceNotFoundException.class);
		assertThat(as(bob, () -> search.search("secret", null, null, null, true, true, 20, 0))).isEmpty();
		assertThat(as(bob, () -> tags.findAll())).isEmpty();

		assertThat(as(alice, () -> search.search("secret", null, null, null, true, true, 20, 0)))
				.extracting(SearchResult::id).containsExactly(note.id());
		assertThat(as(alice, () -> tags.findAll())).extracting(Tag::name).containsExactly("private");
	}

	@Test
	void twoUsersCanUseTheSameTagNameIndependently() {
		as(alice, () -> content.capture(new InboxCaptureRequest(ContentType.IDEA, "Alice idea", "", List.of("shared"), "", "")));
		ContentEntry bobs = as(bob, () -> content.capture(new InboxCaptureRequest(ContentType.IDEA, "Bob idea", "", List.of("shared"), "", "")));
		run(bob, () -> content.delete(ContentType.IDEA, bobs.id()));

		assertThat(as(bob, () -> tags.findAll())).isEmpty();
		assertThat(as(alice, () -> tags.findAll())).extracting(Tag::name).containsExactly("shared");
	}

	@Test
	void anEntryCannotBeFiledIntoAnotherUsersProject() {
		Project alicesProject = as(alice, () -> projects.create(new ProjectRequest("Alice project", "", "", "", List.of())));
		ContentEntry bobsNote = as(bob, () -> content.capture(new InboxCaptureRequest(ContentType.NOTE, "Bob note", "", List.of(), "", "")));

		assertThatThrownBy(() -> as(bob, () -> content.assign(ContentType.NOTE, bobsNote.id(), new ContentAssignmentRequest(alicesProject.id()))))
				.isInstanceOf(ResourceNotFoundException.class);
		// The database refuses the mix as well, even if a query ever forgot the owner.
		assertThatThrownBy(() -> jdbc.update("UPDATE notes SET project_id = ? WHERE id = ?", alicesProject.id(), bobsNote.id()))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void referencesCannotPointAtOrRevealAnotherUsersEntries() {
		ContentEntry alicesNote = as(alice, () -> content.capture(new InboxCaptureRequest(ContentType.NOTE, "Alice note", "", List.of(), "", "")));
		ContentEntry bobsNote = as(bob, () -> content.capture(new InboxCaptureRequest(ContentType.NOTE, "Bob note", "", List.of(), "", "")));

		assertThatThrownBy(() -> as(bob, () -> references.create(
				new EntityReferenceRequest(EntityType.NOTE, bobsNote.id(), EntityType.NOTE, alicesNote.id()))))
				.isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> as(bob, () -> references.incoming(EntityType.NOTE, alicesNote.id())))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	void gitTokensBelongToOneUser() {
		run(alice, () -> credentialRepository.save(RepositoryProvider.GITHUB, "alice", "github.com", "encrypted", "abcd",
				"alice", List.of("repo"), GitCredentialStatus.VERIFIED));

		assertThat(as(bob, () -> credentials.findAll())).isEmpty();
		assertThat(as(bob, () -> credentials.hasCredential(RepositoryProvider.GITHUB))).isFalse();
		assertThat(as(alice, () -> credentials.hasCredential(RepositoryProvider.GITHUB))).isTrue();
	}

	private <T> T as(long user, Supplier<T> action) {
		return currentUser.runAs(user, action);
	}

	private void run(long user, Runnable action) {
		currentUser.runAs(user, () -> {
			action.run();
			return null;
		});
	}
}
