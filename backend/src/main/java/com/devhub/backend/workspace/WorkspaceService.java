package com.devhub.backend.workspace;

import static com.devhub.backend.workspace.WorkspaceModels.*;
import com.devhub.backend.workspace.WorkspaceModels.Runtime;
import com.devhub.backend.exception.ConflictException;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.exception.UpstreamException;
import com.devhub.backend.model.ProjectStatus;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.security.CurrentUser;
import com.devhub.backend.service.GitCredentialService;
import com.devhub.backend.service.ProjectService;
import com.devhub.backend.service.RepositoryUrlParser;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceService {
    private final WorkspaceRepository repository;
    private final WorkspaceAccess access;
    private final CurrentUser user;
    private final ProjectService projects;
    private final RepositoryUrlParser urls;
    private final WorkspaceRunner runner;
    private final GitCredentialService credentials;
    private final WorkspaceSettings settings;
    public WorkspaceService(WorkspaceRepository repository, WorkspaceAccess access, CurrentUser user,
            ProjectService projects, RepositoryUrlParser urls, WorkspaceRunner runner, GitCredentialService credentials,
            WorkspaceSettings settings) {
        this.repository = repository; this.access = access; this.user = user; this.projects = projects;
        this.urls = urls; this.runner = runner; this.credentials = credentials; this.settings = settings;
    }
    public List<Workspace> list(Long projectId) {
        access.feature();
        if (projectId != null) access.project(projectId, user.id());
        return repository.list(user.id(), projectId);
    }
    public Workspace own(String id) {
        Workspace w = repository.find(uuid(id)).orElseThrow(() -> new ResourceNotFoundException("Workspace was not found"));
        access.own(w); return w;
    }
    public Workspace get(String id) {
        Workspace w = own(id);
        repository.renew(w.id(), access.expiresAt());
        return repository.find(w.id()).orElseThrow();
    }
    @Transactional
    public Workspace create(long projectId, Create body) {
        access.feature(); access.project(projectId, user.id());
        if (body == null) throw new InvalidRequestException("Workspace settings are required");
        repository.lockProject(projectId);
        var project = projects.findById(projectId);
        if (project.status() == ProjectStatus.ARCHIVED) throw new ConflictException("Restore the project before starting a workspace");
        String url = urls.parse(project.repositoryUrl()).canonicalUrl();
        if (!url.matches("^https://(github\\.com|gitlab\\.com)/[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)+$")
                || url.contains("/../") || url.contains("/./")) throw new InvalidRequestException("Workspaces support GitHub/GitLab HTTPS repositories");
        String branch = text(body.branch(), 100, "Branch");
        if (!branch.matches("[A-Za-z0-9][A-Za-z0-9._/-]*") || branch.contains("..") || branch.contains("//")
                || branch.endsWith("/") || branch.endsWith(".") || branch.endsWith(".lock") || branch.contains("/.")) {
            throw new InvalidRequestException("Choose a valid Git branch name");
        }
        String name = text(body.commitName(), 120, "Commit name");
        String email = text(body.commitEmail(), 200, "Commit email");
        if (!email.matches("[^\\s<>@]+@[^\\s<>@]+")) throw new InvalidRequestException("Enter a valid commit email");
        repository.lockUser(user.id());
        if (!repository.list(user.id(), projectId).isEmpty()) throw new ConflictException("Resume or delete your existing workspace for this project");
        if (repository.list(user.id(), null).size() >= settings.maxPerUser)
            throw new ConflictException("You can keep at most " + settings.maxPerUser + " workspaces; delete one before creating another");
        requireRunningSlot(user.id(), "");
        String id = UUID.randomUUID().toString();
        var now = Instant.now();
        repository.insert(new Workspace(id, projectId, user.id(), url, branch, body.newBranch(), name, email,
                "PROVISIONING", "RUNNING", 1, "", access.expiresAt(), now, now));
        return repository.find(id).orElseThrow();
    }
    @Transactional
    public Workspace start(String id) {
        var initial = own(id); repository.lockUser(initial.ownerId()); repository.lockWorkspace(id); var w = own(id);
        if (projects.findById(w.projectId()).status() == ProjectStatus.ARCHIVED) throw new ConflictException("Restore the project first");
        if (w.desired().equals("RUNNING") && !w.status().equals("ERROR")) return get(id);
        if (!List.of("STOPPED", "ERROR").contains(w.status())) throw new ConflictException("Wait for the current workspace operation");
        requireRunningSlot(w.ownerId(), w.id());
        repository.renew(id, access.expiresAt()); repository.desired(id, "RUNNING");
        return repository.find(id).orElseThrow();
    }
    @Transactional
    public Workspace stop(String id) {
        own(id); repository.lockWorkspace(id); var w = own(id);
        if (!w.desired().equals("STOPPED") || w.status().equals("ERROR")) repository.desired(id, "STOPPED");
        return repository.find(id).orElseThrow();
    }
    public Runtime resources(String id) {
        var w = own(id); return runner.inspect(w.id());
    }
    public GitReport git(String id) { return runner.git(own(id).id()); }
    public GitReport deletionCheck(String id) {
        var w = own(id);
        if (!w.status().equals("STOPPED")) throw new ConflictException("Stop the workspace before checking deletion");
        repository.renew(id, access.expiresAt());
        return runner.git(w.id());
    }
    @Transactional
    public Workspace delete(String id, DeleteInput input) {
        var w = own(id); repository.lockUser(w.ownerId());
        if (!List.of("STOPPED", "ERROR").contains(w.status())) throw new ConflictException("Stop the workspace before deleting it");
        boolean discard = input != null && input.discard();
        if (discard && !id.equals(input.confirmation())) throw new InvalidRequestException("Confirm discarding by entering the workspace ID");
        // The runner stops all writers and repeats this check at the moment of deletion.
        if (!discard && !runner.git(id).safe()) throw new ConflictException("Git changes are not safely stored upstream; review them or explicitly discard");
        repository.deletion(id, discard);
        return repository.find(id).orElseThrow();
    }
    public List<Profile> profiles() { access.feature(); return repository.profiles(user.id()); }
    @Transactional
    public Profile createProfile(ProfileInput input) {
        access.feature();
        if (input == null) throw new InvalidRequestException("Profile settings are required");
        var providers = providerList(input.providers(), input.provider());
        repository.lockUser(user.id());
        if (repository.profiles(user.id()).size() >= 20) throw new ConflictException("At most 20 AI profiles per user");
        String id = UUID.randomUUID().toString();
        try { repository.insertProfile(id, user.id(), providers, text(input.name(), 120, "Profile name")); }
        catch (DataIntegrityViolationException e) { throw new ConflictException("An AI profile with this name already exists"); }
        return repository.profile(id, user.id());
    }
    @Transactional
    public Profile updateProfile(String id, ProfilePatch input) {
        access.feature(); repository.lockUser(user.id());
        var existing = repository.profile(uuid(id), user.id());
        if (input == null) throw new InvalidRequestException("Profile settings are required");
        String name = input.name() == null ? existing.name() : text(input.name(), 120, "Profile name");
        var providers = input.providers() == null ? existing.providers() : providerList(input.providers(), null);
        var disabled = existing.providers().stream().filter(p -> !providers.contains(p)).toList();
        for (String provider : disabled) {
            var terminals = repository.terminalsUsingProvider(id, provider);
            if (!terminals.isEmpty()) throw new ConflictException("End terminals using " + provider + " before disabling it: " + String.join(", ", terminals));
        }
        if (!disabled.isEmpty()) runner.checkProfile(user.id(), id, disabled);
        try { repository.updateProfile(id, name, providers); }
        catch (DataIntegrityViolationException e) { throw new ConflictException("An AI profile with this name already exists"); }
        return repository.profile(id, user.id());
    }
    @Transactional
    public void deleteProfile(String id) {
        access.feature(); repository.lockUser(user.id());
        repository.profile(uuid(id), user.id());
        if (repository.hasRunning(user.id(), "")) throw new ConflictException("Stop your workspaces before deleting login profiles");
        if (repository.profileUsed(id)) throw new ConflictException("Close terminals using this profile before removing it");
        runner.deleteProfile(user.id(), id);
        repository.deleteProfile(id, user.id());
    }
    private List<String> providerList(List<String> values, String legacy) {
        if (values == null) values = legacy == null ? List.of() : List.of(legacy);
        if (values.isEmpty() || values.size() > 2 || values.stream().anyMatch(p -> p == null || !List.of("CLAUDE", "CODEX").contains(p))
                || values.stream().distinct().count() != values.size()) throw new InvalidRequestException("Choose Claude, Codex or both");
        if (legacy != null && (values.size() != 1 || !values.contains(legacy))) throw new InvalidRequestException("Conflicting profile providers; reload Dev Hub");
        return values.stream().sorted().toList();
    }
    public List<Terminal> terminals(String id) { return repository.terminals(own(id).id()); }
    @Transactional
    public Terminal createTerminal(String id, TerminalInput input) {
        var w = own(id); repository.lockUser(w.ownerId());
        if (!w.status().equals("RUNNING") || !w.desired().equals("RUNNING")) throw new ConflictException("Wait until the workspace is running");
        String mode = input == null ? "SHELL" : input.launchMode() != null ? input.launchMode() : input.provider();
        if (!List.of("SHELL", "CLAUDE", "CODEX").contains(mode == null ? "" : mode)) throw new InvalidRequestException("Choose Shell, Claude or Codex");
        if (input != null && input.launchMode() != null && input.provider() != null && !input.launchMode().equals(input.provider()))
            throw new InvalidRequestException("Conflicting terminal launch modes");
        String profile = input == null ? null : input.profileId();
        List<String> providers = List.of();
        if (profile != null) {
            var p = repository.profile(uuid(profile), w.ownerId());
            providers = p.providers();
            if (!mode.equals("SHELL") && !providers.contains(mode)) throw new InvalidRequestException("This provider is not enabled on the selected profile");
        } else if (!mode.equals("SHELL")) throw new InvalidRequestException("Choose a profile for this CLI");
        if (repository.terminals(id).size() >= 8) throw new ConflictException("At most eight terminals per workspace");
        var t = new Terminal(UUID.randomUUID().toString(), id, mode, profile, providers);
        repository.insertTerminal(t);
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) {
                            try { runner.closeTerminal(w.id(), t.id()); } catch (Exception ignored) {
                                // The runner retains its session metadata and blocks profile cleanup/disable until stopped.
                            }
                        }
                    }
                });
        runner.terminal(w, t);
        repository.renew(id, access.expiresAt());
        return t;
    }
    public Terminal terminal(String workspace, String terminal) {
        own(workspace);
        return repository.terminals(workspace).stream().filter(t -> t.id().equals(uuid(terminal))).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Terminal was not found"));
    }
    public void closeTerminal(String workspace, String terminal) {
        var t = terminal(workspace, terminal); runner.closeTerminal(workspace, t.id()); repository.deleteTerminal(t.id());
    }
    public Credential runnerCredential(String id) {
        var w = repository.find(uuid(id)).orElseThrow(() -> new ResourceNotFoundException("Workspace was not found"));
        if ((!w.desired().equals("RUNNING") && !w.status().equals("STOPPED") && !w.status().equals("DELETING")) || !w.authorizedUntil().isAfter(Instant.now()))
            throw new com.devhub.backend.exception.ForbiddenException("Workspace credential authorization expired");
        access.project(w.projectId(), w.ownerId());
        RepositoryProvider provider = w.repositoryUrl().startsWith("https://github.com/") ? RepositoryProvider.GITHUB : RepositoryProvider.GITLAB;
        return user.runAs(w.ownerId(), () -> credentials.credentialFor(provider)
                .map(c -> new Credential(provider == RepositoryProvider.GITHUB ? "x-access-token" : "oauth2", c.token()))
                .orElse(new Credential("", "")));
    }
    private void requireRunningSlot(long owner, String except) {
        if (repository.countRunning(owner, except) >= settings.maxRunningPerUser)
            throw new ConflictException("At most " + settings.maxRunningPerUser + " of your workspaces can run at once; stop one first");
    }
    static String uuid(String id) {
        try { if (!UUID.fromString(id).toString().equals(id)) throw new IllegalArgumentException(); return id; }
        catch (RuntimeException e) { throw new InvalidRequestException("Invalid workspace/profile/terminal ID"); }
    }
    private static String text(String value, int max, String label) {
        if (value == null || value.isBlank() || value.length() > max || value.chars().anyMatch(c -> c < 32 || c == 127))
            throw new InvalidRequestException(label + " is required and must not contain control characters");
        return value.trim();
    }
}
