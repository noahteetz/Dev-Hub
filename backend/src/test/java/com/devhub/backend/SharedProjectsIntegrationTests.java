package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.dto.ContentArchiveRequest;
import com.devhub.backend.dto.ContentAssignmentRequest;
import com.devhub.backend.dto.EntityReferenceRequest;
import com.devhub.backend.dto.IdeaRequest;
import com.devhub.backend.dto.InboxCaptureRequest;
import com.devhub.backend.dto.NoteRequest;
import com.devhub.backend.dto.ProjectArchiveRequest;
import com.devhub.backend.dto.ProjectContextRequest;
import com.devhub.backend.dto.ProjectMemberRequest;
import com.devhub.backend.dto.ProjectMemberRoleRequest;
import com.devhub.backend.dto.ProjectOrganizationRequest;
import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.dto.TodoRequest;
import com.devhub.backend.exception.ConflictException;
import com.devhub.backend.exception.ForbiddenException;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.ContentEntry;
import com.devhub.backend.model.ContentType;
import com.devhub.backend.model.EntityReference;
import com.devhub.backend.model.EntityType;
import com.devhub.backend.model.Idea;
import com.devhub.backend.model.Note;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.ProjectMember;
import com.devhub.backend.model.ProjectRole;
import com.devhub.backend.model.ProjectStatus;
import com.devhub.backend.model.SearchResult;
import com.devhub.backend.model.Tag;
import com.devhub.backend.model.Todo;
import com.devhub.backend.repository.AppUserRepository;
import com.devhub.backend.security.CurrentUser;
import com.devhub.backend.service.EntityReferenceService;
import com.devhub.backend.service.GlobalContentService;
import com.devhub.backend.service.IdeaService;
import com.devhub.backend.service.NoteService;
import com.devhub.backend.service.ProjectMemberService;
import com.devhub.backend.service.ProjectService;
import com.devhub.backend.service.RepositoryMetadataService;
import com.devhub.backend.service.SearchService;
import com.devhub.backend.service.TagService;
import com.devhub.backend.service.TodoService;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/** Alice owns a project she shares with Ed (EDITOR) and Vera (VIEWER); Nina is nobody's member. */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SharedProjectsIntegrationTests {

	@Autowired ProjectService projects;
	@Autowired ProjectMemberService members;
	@Autowired NoteService notes;
	@Autowired IdeaService ideas;
	@Autowired TodoService todos;
	@Autowired GlobalContentService content;
	@Autowired SearchService search;
	@Autowired TagService tags;
	@Autowired EntityReferenceService references;
	@Autowired RepositoryMetadataService repository;
	@Autowired AppUserRepository users;
	@Autowired CurrentUser currentUser;
	@Autowired JdbcTemplate jdbc;

	private long alice;
	private long ed;
	private long vera;
	private long nina;
	private Project shared;

	@BeforeEach
	void aSharedProject() {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		alice = users.resolve("alice-" + suffix, "alice-" + suffix);
		ed = users.resolve("ed-" + suffix, "ed-" + suffix);
		vera = users.resolve("vera-" + suffix, "vera-" + suffix);
		nina = users.resolve("nina-" + suffix, "nina-" + suffix);
		shared = as(alice, () -> projects.create(new ProjectRequest("Shared", "", "https://github.com/example/shared", "", List.of())));
		run(alice, () -> members.add(shared.id(), new ProjectMemberRequest(ed, ProjectRole.EDITOR)));
		run(alice, () -> members.add(shared.id(), new ProjectMemberRequest(vera, ProjectRole.VIEWER)));
	}

	@Test
	void membersSeeTheProjectWithTheirRoleAndTheOwner() {
		Project forEd = as(ed, () -> projects.findById(shared.id()));

		assertThat(forEd.role()).isEqualTo(ProjectRole.EDITOR);
		assertThat(forEd.shared()).isTrue();
		assertThat(forEd.ownerName()).startsWith("alice-");
		assertThat(as(vera, () -> projects.findAll())).extracting(Project::id).contains(shared.id());
		assertThat(as(vera, () -> projects.findById(shared.id())).role()).isEqualTo(ProjectRole.VIEWER);
		assertThat(as(alice, () -> projects.findById(shared.id())).role()).isEqualTo(ProjectRole.OWNER);
		assertThat(as(nina, () -> projects.findAll())).extracting(Project::id).doesNotContain(shared.id());
		assertThatThrownBy(() -> as(nina, () -> projects.findById(shared.id()))).isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	void aViewerReadsEverythingAndChangesNothing() {
		Note note = as(alice, () -> notes.create(shared.id(), new NoteRequest("Plan", "text")));

		assertThat(as(vera, () -> notes.findAll(shared.id()))).extracting(Note::id).containsExactly(note.id());
		assertThat(as(vera, () -> repository.find(shared.id())).projectId()).isEqualTo(shared.id());

		assertForbidden(vera, () -> notes.create(shared.id(), new NoteRequest("x", "y")));
		assertForbidden(vera, () -> notes.update(shared.id(), note.id(), new NoteRequest("x", "y")));
		assertForbidden(vera, () -> notes.delete(shared.id(), note.id()));
		assertForbidden(vera, () -> ideas.create(shared.id(), new IdeaRequest("x", "", List.of())));
		assertForbidden(vera, () -> todos.create(shared.id(), new TodoRequest("x", "", List.of())));
		assertForbidden(vera, () -> projects.updateContext(shared.id(), context("next")));
		assertForbidden(vera, () -> projects.update(shared.id(), new ProjectRequest("Renamed", "", "", "", List.of())));
		assertForbidden(vera, () -> projects.updateOrganization(shared.id(), new ProjectOrganizationRequest(ProjectStatus.ACTIVE, 2)));
		assertForbidden(vera, () -> projects.archive(shared.id(), new ProjectArchiveRequest("done")));
		assertForbidden(vera, () -> projects.delete(shared.id()));
		assertForbidden(vera, () -> repository.refresh(shared.id()));
		assertForbidden(vera, () -> members.add(shared.id(), new ProjectMemberRequest(nina, ProjectRole.VIEWER)));
	}

	@Test
	void anEditorMaintainsContentAndContextButNotTheRest() {
		Note note = as(ed, () -> notes.create(shared.id(), new NoteRequest("Edited", "by ed")));
		Idea idea = as(ed, () -> ideas.create(shared.id(), new IdeaRequest("Idea", "", List.of("backend"))));
		Todo todo = as(ed, () -> todos.create(shared.id(), new TodoRequest("Todo", "", List.of())));
		as(ed, () -> todos.setCompleted(shared.id(), todo.id(), true));
		as(ed, () -> ideas.convertToTodo(shared.id(), idea.id()));
		Project withContext = as(ed, () -> projects.updateContext(shared.id(), context("Ship it")));

		assertThat(note.createdBy()).startsWith("ed-");
		assertThat(withContext.nextStep()).isEqualTo("Ship it");
		assertThat(jdbc.queryForObject("SELECT owner_id FROM notes WHERE id = ?", Long.class, note.id())).isEqualTo(alice);
		assertThat(as(alice, () -> notes.findAll(shared.id()))).extracting(Note::id).containsExactly(note.id());

		assertForbidden(ed, () -> projects.update(shared.id(), new ProjectRequest("Renamed", "", "", "", List.of())));
		assertForbidden(ed, () -> projects.updateOrganization(shared.id(), new ProjectOrganizationRequest(ProjectStatus.PAUSED, 1)));
		assertForbidden(ed, () -> projects.archive(shared.id(), new ProjectArchiveRequest("done")));
		assertForbidden(ed, () -> projects.restore(shared.id()));
		assertForbidden(ed, () -> projects.delete(shared.id()));
		assertForbidden(ed, () -> repository.refresh(shared.id()));
		assertForbidden(ed, () -> members.changeRole(shared.id(), vera, new ProjectMemberRoleRequest(ProjectRole.EDITOR)));
		assertForbidden(ed, () -> members.remove(shared.id(), vera));
	}

	@Test
	void aNonMemberGetsNotFoundEverywhere() {
		Note note = as(alice, () -> notes.create(shared.id(), new NoteRequest("Plan", "text")));

		assertNotFound(nina, () -> notes.findAll(shared.id()));
		assertNotFound(nina, () -> notes.create(shared.id(), new NoteRequest("x", "y")));
		assertNotFound(nina, () -> notes.delete(shared.id(), note.id()));
		assertNotFound(nina, () -> projects.updateContext(shared.id(), context("x")));
		assertNotFound(nina, () -> projects.setFavorite(shared.id(), true));
		assertNotFound(nina, () -> members.findAll(shared.id()));
		assertNotFound(nina, () -> members.leave(shared.id()));
		assertNotFound(nina, () -> tags.findAllForProject(shared.id()));
		assertNotFound(nina, () -> content.find(ContentType.NOTE, note.id()));
		assertNotFound(nina, () -> content.delete(ContentType.NOTE, note.id()));
	}

	@Test
	void aRemovedMemberLosesAccessAtOnceAndTheirContentStays() {
		Note note = as(ed, () -> notes.create(shared.id(), new NoteRequest("Written by ed", "body")));

		run(alice, () -> members.remove(shared.id(), ed));

		assertNotFound(ed, () -> notes.findAll(shared.id()));
		assertNotFound(ed, () -> notes.create(shared.id(), new NoteRequest("x", "y")));
		assertThat(as(ed, () -> projects.findAll())).extracting(Project::id).doesNotContain(shared.id());
		Note kept = as(alice, () -> notes.findById(shared.id(), note.id()));
		assertThat(kept.createdBy()).startsWith("ed-");
	}

	@Test
	void aMemberCanLeaveButTheOwnerCannot() {
		run(vera, () -> members.leave(shared.id()));

		assertNotFound(vera, () -> projects.findById(shared.id()));
		assertThatThrownBy(() -> run(alice, () -> members.leave(shared.id()))).isInstanceOf(InvalidRequestException.class);
	}

	@Test
	void theMemberListStartsWithTheOwnerAndFollowsTheRules() {
		List<ProjectMember> list = as(vera, () -> members.findAll(shared.id()));

		assertThat(list).extracting(ProjectMember::role).containsExactly(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER);
		assertThat(list.getFirst().userId()).isEqualTo(alice);
		assertThatThrownBy(() -> run(alice, () -> members.add(shared.id(), new ProjectMemberRequest(ed, ProjectRole.VIEWER))))
				.isInstanceOf(ConflictException.class);
		assertThatThrownBy(() -> run(alice, () -> members.add(shared.id(), new ProjectMemberRequest(alice, ProjectRole.VIEWER))))
				.isInstanceOf(InvalidRequestException.class);
		assertThatThrownBy(() -> run(alice, () -> members.add(shared.id(), new ProjectMemberRequest(nina, ProjectRole.OWNER))))
				.isInstanceOf(InvalidRequestException.class);
		assertThatThrownBy(() -> run(alice, () -> members.add(shared.id(), new ProjectMemberRequest(987654321L, ProjectRole.VIEWER))))
				.isInstanceOf(ResourceNotFoundException.class);

		ProjectMember promoted = as(alice, () -> members.changeRole(shared.id(), vera, new ProjectMemberRoleRequest(ProjectRole.EDITOR)));
		assertThat(promoted.role()).isEqualTo(ProjectRole.EDITOR);
		run(vera, () -> notes.create(shared.id(), new NoteRequest("Now allowed", "yes")));
	}

	@Test
	void deletingTheProjectRemovesItsMemberships() {
		run(alice, () -> projects.delete(shared.id()));

		assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_members WHERE project_id = ?", Integer.class, shared.id())).isZero();
		assertNotFound(ed, () -> projects.findById(shared.id()));
	}

	@Test
	void favoritesArePersonal() {
		as(ed, () -> projects.setFavorite(shared.id(), true));
		as(vera, () -> projects.setFavorite(shared.id(), true));
		as(vera, () -> projects.setFavorite(shared.id(), false));

		assertThat(as(ed, () -> projects.findById(shared.id())).favorite()).isTrue();
		assertThat(as(vera, () -> projects.findById(shared.id())).favorite()).isFalse();
		assertThat(as(alice, () -> projects.findById(shared.id())).favorite()).isFalse();
	}

	@Test
	void entriesOfAProjectUseTheOwnersTags() {
		as(ed, () -> ideas.create(shared.id(), new IdeaRequest("Tagged", "", List.of("backend"))));

		assertThat(as(alice, () -> tags.findAll())).extracting(Tag::name).containsExactly("backend");
		assertThat(as(vera, () -> tags.findAllForProject(shared.id()))).extracting(Tag::name).containsExactly("backend");
		assertThat(as(ed, () -> tags.findAll())).isEmpty();
	}

	@Test
	void aMemberFilesOwnInboxEntriesButOnlyTheOwnerTakesThemOut() {
		ContentEntry inbox = as(ed, () -> content.capture(new InboxCaptureRequest(ContentType.IDEA, "From ed", "", List.of("mine"), "", "")));

		ContentEntry filed = as(ed, () -> content.assign(ContentType.IDEA, inbox.id(), new ContentAssignmentRequest(shared.id())));

		assertThat(filed.projectId()).isEqualTo(shared.id());
		assertThat(filed.createdBy()).startsWith("ed-");
		assertThat(jdbc.queryForObject("SELECT owner_id FROM ideas WHERE id = ?", Long.class, inbox.id())).isEqualTo(alice);
		assertThat(as(alice, () -> tags.findAll())).extracting(Tag::name).containsExactly("mine");
		assertThat(as(ed, () -> tags.findAll())).isEmpty();
		assertThat(as(vera, () -> content.find(ContentType.IDEA, inbox.id())).title()).isEqualTo("From ed");
		assertThat(as(ed, () -> content.findAll(ContentType.IDEA, "inbox", null, null, null))).isEmpty();

		assertForbidden(ed, () -> content.assign(ContentType.IDEA, inbox.id(), new ContentAssignmentRequest(null)));
		assertForbidden(vera, () -> content.assign(ContentType.IDEA, inbox.id(), new ContentAssignmentRequest(null)));

		ContentEntry detached = as(alice, () -> content.assign(ContentType.IDEA, inbox.id(), new ContentAssignmentRequest(null)));
		assertThat(detached.projectId()).isNull();
		assertThat(as(alice, () -> content.findAll(ContentType.IDEA, "inbox", null, null, null))).extracting(ContentEntry::id).contains(inbox.id());
		assertNotFound(ed, () -> content.find(ContentType.IDEA, inbox.id()));
		assertThat(as(alice, () -> tags.findAll())).extracting(Tag::name).containsExactly("mine");
	}

	@Test
	void aViewerCannotFileEntriesIntoTheProject() {
		ContentEntry inbox = as(vera, () -> content.capture(new InboxCaptureRequest(ContentType.NOTE, "From vera", "", List.of(), "", "")));

		assertForbidden(vera, () -> content.assign(ContentType.NOTE, inbox.id(), new ContentAssignmentRequest(shared.id())));
		assertNotFound(nina, () -> content.assign(ContentType.NOTE, inbox.id(), new ContentAssignmentRequest(shared.id())));
	}

	@Test
	void entriesInASharedProjectFollowTheRoleOnTheFlatRoutes() {
		Note note = as(alice, () -> notes.create(shared.id(), new NoteRequest("Plan", "text")));
		Todo todo = as(alice, () -> todos.create(shared.id(), new TodoRequest("Todo", "", List.of())));

		assertThat(as(vera, () -> content.findAll(ContentType.NOTE, "project", shared.id(), null, null))).extracting(ContentEntry::id).contains(note.id());
		assertForbidden(vera, () -> content.update(ContentType.NOTE, note.id(), new InboxCaptureRequest(ContentType.NOTE, "x", "y", List.of(), "", "")));
		assertForbidden(vera, () -> content.archive(ContentType.NOTE, note.id(), new ContentArchiveRequest(true)));
		assertForbidden(vera, () -> content.setCompleted(todo.id(), true));
		assertForbidden(vera, () -> content.delete(ContentType.NOTE, note.id()));
		assertNotFound(nina, () -> content.update(ContentType.NOTE, note.id(), new InboxCaptureRequest(ContentType.NOTE, "x", "y", List.of(), "", "")));

		ContentEntry updated = as(ed, () -> content.update(ContentType.NOTE, note.id(),
				new InboxCaptureRequest(ContentType.NOTE, "Renamed by ed", "text", List.of("later"), "", "")));
		assertThat(updated.title()).isEqualTo("Renamed by ed");
		assertThat(as(alice, () -> tags.findAll())).extracting(Tag::name).containsExactly("later");
		assertThat(as(ed, () -> content.setCompleted(todo.id(), true)).completed()).isTrue();
	}

	@Test
	void searchFindsSharedEntriesOnlyForMembers() {
		as(alice, () -> notes.create(shared.id(), new NoteRequest("Zebrafish plan", "text")));
		as(alice, () -> projects.updateContext(shared.id(), context("Zebrafish rollout")));

		assertThat(as(vera, () -> search.search("zebrafish", null, null, null, true, true, 20, 0)))
				.extracting(SearchResult::type).containsExactlyInAnyOrder(EntityType.NOTE, EntityType.PROJECT);
		assertThat(as(nina, () -> search.search("zebrafish", null, null, null, true, true, 20, 0))).isEmpty();
	}

	@Test
	void referencesAreVisibleOnlyToThoseWhoSeeBothEnds() {
		Note note = as(alice, () -> notes.create(shared.id(), new NoteRequest("Shared note", "text")));
		Idea idea = as(alice, () -> ideas.create(shared.id(), new IdeaRequest("Shared idea", "", List.of())));
		ContentEntry privateNote = as(ed, () -> content.capture(new InboxCaptureRequest(ContentType.NOTE, "Ed private", "", List.of(), "", "")));

		EntityReference inside = as(ed, () -> references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.IDEA, idea.id())));
		EntityReference crossing = as(ed, () -> references.create(new EntityReferenceRequest(EntityType.NOTE, privateNote.id(), EntityType.NOTE, note.id())));

		assertThat(as(vera, () -> references.outgoing(EntityType.NOTE, note.id()))).extracting(EntityReference::id).containsExactly(inside.id());
		assertThat(as(vera, () -> references.incoming(EntityType.NOTE, note.id()))).isEmpty();
		assertThat(as(alice, () -> references.incoming(EntityType.NOTE, note.id()))).isEmpty();
		assertThat(as(ed, () -> references.incoming(EntityType.NOTE, note.id()))).extracting(EntityReference::id).containsExactly(crossing.id());
		assertForbidden(vera, () -> references.create(new EntityReferenceRequest(EntityType.IDEA, idea.id(), EntityType.NOTE, note.id())));
		assertNotFound(nina, () -> references.outgoing(EntityType.NOTE, note.id()));

		run(alice, () -> references.delete(inside.id()));
		assertThat(as(vera, () -> references.outgoing(EntityType.NOTE, note.id()))).isEmpty();
	}

	@Test
	void anEditorStartsAnOwnProjectFromASharedIdea() {
		Idea idea = as(alice, () -> ideas.create(shared.id(), new IdeaRequest("Spin off", "Details", List.of())));

		Project spinOff = as(ed, () -> content.promote(ContentType.IDEA, idea.id()));

		assertThat(spinOff.name()).isEqualTo("Spin off");
		assertThat(spinOff.role()).isEqualTo(ProjectRole.OWNER);
		assertThat(as(alice, () -> ideas.findById(shared.id(), idea.id())).projectId()).isEqualTo(shared.id());
		assertThat(as(ed, () -> references.incoming(EntityType.IDEA, idea.id()))).extracting(EntityReference::sourceId).containsExactly(spinOff.id());
		assertForbidden(vera, () -> content.promote(ContentType.IDEA, idea.id()));
		assertThatThrownBy(() -> as(alice, () -> content.promote(ContentType.IDEA, idea.id()))).isInstanceOf(ConflictException.class);
	}


	@Test
	void aRemovedReferenceAuthorCannotDeleteProjectLinks() {
		Note note = as(alice, () -> notes.create(shared.id(), new NoteRequest("Source", "text")));
		Idea idea = as(alice, () -> ideas.create(shared.id(), new IdeaRequest("Target", "", List.of())));
		EntityReference link = as(ed, () -> references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.IDEA, idea.id())));

		run(alice, () -> members.remove(shared.id(), ed));

		assertNotFound(ed, () -> references.delete(link.id()));
		assertThat(as(alice, () -> references.outgoing(EntityType.NOTE, note.id())))
				.extracting(EntityReference::id).containsExactly(link.id());
		run(alice, () -> references.delete(link.id()));
		assertThat(as(alice, () -> references.outgoing(EntityType.NOTE, note.id()))).isEmpty();
	}

	@Test
	void aReferenceAuthorDowngradedToViewerCannotDeleteProjectLinks() {
		Note note = as(alice, () -> notes.create(shared.id(), new NoteRequest("Source", "text")));
		Idea idea = as(alice, () -> ideas.create(shared.id(), new IdeaRequest("Target", "", List.of())));
		EntityReference link = as(ed, () -> references.create(new EntityReferenceRequest(EntityType.NOTE, note.id(), EntityType.IDEA, idea.id())));

		run(alice, () -> members.changeRole(shared.id(), ed, new ProjectMemberRoleRequest(ProjectRole.VIEWER)));

		assertNotFound(ed, () -> references.delete(link.id()));
		assertThat(as(ed, () -> references.outgoing(EntityType.NOTE, note.id())))
				.extracting(EntityReference::id).containsExactly(link.id());
	}

	@Test
	void aFormerMemberCanStillDeleteLinksFromTheirOwnInbox() {
		Note note = as(alice, () -> notes.create(shared.id(), new NoteRequest("Shared target", "text")));
		ContentEntry inbox = as(ed, () -> content.capture(new InboxCaptureRequest(ContentType.NOTE, "Own source", "", List.of(), "", "")));
		EntityReference link = as(ed, () -> references.create(new EntityReferenceRequest(EntityType.NOTE, inbox.id(), EntityType.NOTE, note.id())));

		run(alice, () -> members.remove(shared.id(), ed));
		run(ed, () -> references.delete(link.id()));

		assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM entity_references WHERE id = ?", Integer.class, link.id())).isZero();
	}

	@Test
	void membersGetOnlyTagsUsedInThisProjectAcrossAllContentTypes() {
		as(alice, () -> content.capture(new InboxCaptureRequest(ContentType.NOTE, "Private inbox", "", List.of("private-inbox"), "", "")));
		Project privateProject = as(alice, () -> projects.create(new ProjectRequest("Private project", "", "", "", List.of())));
		as(alice, () -> ideas.create(privateProject.id(), new IdeaRequest("Private idea", "", List.of("private-project"))));
		for (ContentType type : ContentType.values()) {
			ContentEntry entry = as(alice, () -> content.capture(new InboxCaptureRequest(type, "Shared " + type, "body", List.of(type.name().toLowerCase(), "common"), "", "text")));
			as(alice, () -> content.assign(type, entry.id(), new ContentAssignmentRequest(shared.id())));
		}

		for (long member : List.of(ed, vera)) {
			assertThat(as(member, () -> tags.findAllForProject(shared.id())))
					.extracting(Tag::name).containsExactly("common", "idea", "note", "snippet", "todo");
		}
		assertThat(as(alice, () -> tags.findAllForProject(shared.id())))
				.extracting(Tag::name).contains("private-inbox", "private-project");
		assertNotFound(nina, () -> tags.findAllForProject(shared.id()));
		run(alice, () -> members.remove(shared.id(), ed));
		assertNotFound(ed, () -> tags.findAllForProject(shared.id()));
	}

	private static ProjectContextRequest context(String nextStep) {
		return new ProjectContextRequest("", nextStep, "", "", "", "");
	}

	private void assertForbidden(long user, Runnable action) {
		assertThatThrownBy(() -> run(user, action)).isInstanceOf(ForbiddenException.class);
	}

	private void assertNotFound(long user, Runnable action) {
		assertThatThrownBy(() -> run(user, action)).isInstanceOf(ResourceNotFoundException.class);
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
