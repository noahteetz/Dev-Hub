package com.devhub.backend;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.devhub.backend.dto.*;
import com.devhub.backend.exception.*;
import com.devhub.backend.model.*;
import com.devhub.backend.repository.*;
import com.devhub.backend.security.CurrentUser;
import com.devhub.backend.service.*;
import com.devhub.backend.workspace.*;
import com.devhub.backend.workspace.WorkspaceModels.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {"devhub.workspace.enabled=true", "devhub.workspace.worker-enabled=false",
        "devhub.workspace.runner-token=test-runner-token-with-at-least-32-characters"})
@ActiveProfiles("test")
@Transactional
class WorkspaceIntegrationTests {
    @Autowired WorkspaceService service;
    @Autowired WorkspaceRepository repository;
    @Autowired WorkspaceSettings settings;
    @Autowired WorkspaceWorker worker;
    @Autowired TerminalTickets tickets;
    @Autowired CurrentUser currentUser;
    @Autowired AppUserRepository users;
    @Autowired ProjectService projects;
    @Autowired ProjectMemberService members;
    @Autowired GitCredentialRepository credentials;
    @Autowired TokenCipher cipher;
    @MockitoBean WorkspaceRunner runner;
    long owner, editor, viewer, stranger;
    Project project;

    @BeforeEach void setup() {
        String suffix = UUID.randomUUID().toString();
        owner = users.resolve("owner-" + suffix, "Owner");
        editor = users.resolve("editor-" + suffix, "Editor");
        viewer = users.resolve("viewer-" + suffix, "Viewer");
        stranger = users.resolve("stranger-" + suffix, "Stranger");
        project = as(owner, () -> projects.create(new ProjectRequest("Remote", "", "https://github.com/example/repository", "", List.of())));
        as(owner, () -> members.add(project.id(), new ProjectMemberRequest(editor, ProjectRole.EDITOR)));
        as(owner, () -> members.add(project.id(), new ProjectMemberRequest(viewer, ProjectRole.VIEWER)));
        when(runner.git(anyString())).thenReturn(new GitReport(true, true, "main", List.of(), List.of(), List.of()));
    }
    Create input() { return new Create("work/test", true, "Tester", "test@example.com"); }
    Workspace create(long user) { return as(user, () -> service.create(project.id(), input())); }
    Workspace running(long user) {
        var w = create(user); repository.complete(w, "RUNNING", ""); return repository.find(w.id()).orElseThrow();
    }
    @Test void membersUseSeparateWorkspacesAndViewersCannotExecute() {
        var mine = create(owner); var theirs = create(editor);
        assertThat(mine.ownerId()).isEqualTo(owner); assertThat(theirs.ownerId()).isEqualTo(editor);
        assertThatThrownBy(() -> create(viewer)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> create(stranger)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> as(owner, () -> service.get(theirs.id()))).isInstanceOf(ResourceNotFoundException.class);
        assertThat(as(owner, () -> service.list(project.id()))).extracting(Workspace::id).containsExactly(mine.id());
    }
    @Test void activeWorkspaceLimitsAndProjectDeletionProtectRetainedFiles() {
        var w = create(owner);
        assertThatThrownBy(() -> create(owner)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> as(owner, () -> { projects.delete(project.id()); return null; })).isInstanceOf(ConflictException.class);
        as(owner, () -> service.stop(w.id()));
        repository.complete(repository.find(w.id()).orElseThrow(), "STOPPED", "");
        assertThat(as(owner, () -> service.get(w.id())).status()).isEqualTo("STOPPED");
        assertThatThrownBy(() -> as(owner, () -> { projects.delete(project.id()); return null; })).isInstanceOf(ConflictException.class);
        as(owner, () -> service.delete(w.id(), new DeleteInput(false, "")));
        repository.complete(repository.find(w.id()).orElseThrow(), "DELETED", "");
        as(owner, () -> { projects.delete(project.id()); return null; });
        assertThat(repository.find(w.id())).isEmpty();
    }
    @Test void deletionRequiresKnownGitStateOrExplicitIdConfirmation() {
        var w = running(owner);
        assertThatThrownBy(() -> as(owner, () -> service.delete(w.id(), null))).isInstanceOf(ConflictException.class);
        as(owner, () -> service.stop(w.id())); repository.complete(repository.find(w.id()).orElseThrow(), "STOPPED", "");
        when(runner.git(w.id())).thenReturn(new GitReport(false, false, "", List.of("offline"), List.of(), List.of()));
        assertThatThrownBy(() -> as(owner, () -> service.delete(w.id(), null))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> as(owner, () -> service.delete(w.id(), new DeleteInput(true, "yes")))).isInstanceOf(InvalidRequestException.class);
        assertThat(as(owner, () -> service.delete(w.id(), new DeleteInput(true, w.id()))).desired()).isEqualTo("DELETED");
    }
    @Test void terminalProfilesArePersonalAndCannotBeUsedConcurrently() {
        var w = running(owner);
        var p = as(owner, () -> service.createProfile(new ProfileInput("CODEX", "Personal")));
        var t = as(owner, () -> service.createTerminal(w.id(), new TerminalInput("CODEX", p.id())));
        assertThat(t.profileId()).isEqualTo(p.id());
        assertThatThrownBy(() -> as(owner, () -> service.createTerminal(w.id(), new TerminalInput("CODEX", p.id())))).isInstanceOf(ConflictException.class);
        var other = running(editor);
        assertThatThrownBy(() -> as(editor, () -> service.createTerminal(other.id(), new TerminalInput("CODEX", p.id())))).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> as(owner, () -> { service.deleteProfile(p.id()); return null; })).isInstanceOf(ConflictException.class);
    }
    @Test void ticketsAreOneTimeBoundAndExpireWithAuthenticationAndMembership() {
        var w = running(editor);
        var t = as(editor, () -> service.createTerminal(w.id(), new TerminalInput("SHELL", null)));
        var ticket = tickets.issue(w, t, Instant.now().plusSeconds(60));
        assertThatThrownBy(() -> tickets.consume(ticket.ticket(), w.id(), UUID.randomUUID().toString())).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> tickets.consume(ticket.ticket(), w.id(), t.id())).isInstanceOf(ForbiddenException.class);
        var valid = tickets.issue(w, t, Instant.now().plusSeconds(60));
        var grant = tickets.consume(valid.ticket(), w.id(), t.id());
        assertThatThrownBy(() -> tickets.consume(valid.ticket(), w.id(), t.id())).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> tickets.issue(w, t, Instant.now().minusSeconds(1))).isInstanceOf(ForbiddenException.class);
        as(owner, () -> { members.changeRole(project.id(), editor, new ProjectMemberRoleRequest(ProjectRole.VIEWER)); return null; });
        assertThatThrownBy(() -> tickets.check(grant)).isInstanceOf(ForbiddenException.class);
        settings.workerEnabled = true;
        try { worker.reconcile(); worker.reconcile(); }
        finally { settings.workerEnabled = false; }
        verify(runner).stop(argThat(value -> value.id().equals(w.id())));
        assertThat(repository.find(w.id()).orElseThrow().status()).isEqualTo("STOPPED");
    }
    @Test void credentialBrokerUsesExecutingUsersTokenAndRejectsExpiredAccess() {
        var w = running(editor);
        as(owner, () -> { credentials.save(RepositoryProvider.GITHUB, "owner", "github.com", cipher.encrypt("owner-secret"),
                "cret", "owner", List.of("repo"), GitCredentialStatus.VERIFIED); return null; });
        as(editor, () -> { credentials.save(RepositoryProvider.GITHUB, "editor", "github.com", cipher.encrypt("editor-secret"),
                "cret", "editor", List.of("repo"), GitCredentialStatus.VERIFIED); return null; });
        assertThat(service.runnerCredential(w.id()).password()).isEqualTo("editor-secret");
        repository.renew(w.id(), Instant.now().minusSeconds(1));
        assertThatThrownBy(() -> service.runnerCredential(w.id())).isInstanceOf(ForbiddenException.class);
    }
    @Test void staleWorkerCompletionDoesNotOverwriteNewStopRequest() {
        var w = create(owner);
        assertThat(repository.claim(w)).isTrue(); assertThat(repository.claim(w)).isFalse();
        as(owner, () -> service.stop(w.id()));
        repository.complete(w, "RUNNING", "");
        assertThat(repository.find(w.id()).orElseThrow().status()).isEqualTo("STOPPING");
    }
    private <T> T as(long user, Supplier<T> action) { return currentUser.runAs(user, action); }
}
