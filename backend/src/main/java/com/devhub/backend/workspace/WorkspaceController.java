package com.devhub.backend.workspace;

import static com.devhub.backend.workspace.WorkspaceModels.*;
import com.devhub.backend.workspace.WorkspaceModels.Runtime;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class WorkspaceController {
    private final WorkspaceService service;
    private final WorkspaceSettings settings;
    private final WorkspaceAccess access;
    private final TerminalTickets tickets;
    public WorkspaceController(WorkspaceService service, WorkspaceSettings settings, WorkspaceAccess access, TerminalTickets tickets) {
        this.service = service; this.settings = settings; this.access = access; this.tickets = tickets;
    }
    @GetMapping("/api/workspaces/config") public Config config() { return new Config(settings.enabled, access.allowed(), settings.maxRunningPerUser, settings.maxPerUser); }
    @GetMapping("/api/workspaces") public List<Workspace> mine() { return service.list(null); }
    @GetMapping("/api/projects/{project}/workspaces") public List<Workspace> list(@PathVariable long project) { return service.list(project); }
    @PostMapping("/api/projects/{project}/workspaces") public Workspace create(@PathVariable long project, @RequestBody Create body) { return service.create(project, body); }
    @GetMapping("/api/workspaces/{id}") public Workspace get(@PathVariable String id) { return service.get(id); }
    @PostMapping("/api/workspaces/{id}/start") public Workspace start(@PathVariable String id) { return service.start(id); }
    @PostMapping("/api/workspaces/{id}/stop") public Workspace stop(@PathVariable String id) { return service.stop(id); }
    @GetMapping("/api/workspaces/{id}/resources") public Runtime resources(@PathVariable String id) { return service.resources(id); }
    @GetMapping("/api/workspaces/{id}/git-status") public GitReport git(@PathVariable String id) { return service.git(id); }
    @PostMapping("/api/workspaces/{id}/deletion-check") public GitReport check(@PathVariable String id) { return service.deletionCheck(id); }
    @DeleteMapping("/api/workspaces/{id}") public Workspace delete(@PathVariable String id, @RequestBody(required = false) DeleteInput input) { return service.delete(id, input); }
    @GetMapping("/api/ai-profiles") public List<Profile> profiles() { return service.profiles(); }
    @PostMapping("/api/ai-profiles") public Profile profile(@RequestBody ProfileInput input) { return service.createProfile(input); }
    @DeleteMapping("/api/ai-profiles/{id}") public void deleteProfile(@PathVariable String id) { service.deleteProfile(id); }
    @GetMapping("/api/workspaces/{id}/terminals") public List<Terminal> terminals(@PathVariable String id) { return service.terminals(id); }
    @PostMapping("/api/workspaces/{id}/terminals") public Terminal terminal(@PathVariable String id, @RequestBody TerminalInput input) { return service.createTerminal(id, input); }
    @DeleteMapping("/api/workspaces/{id}/terminals/{terminal}") public void close(@PathVariable String id, @PathVariable String terminal) { service.closeTerminal(id, terminal); }
    @PostMapping("/api/workspaces/{id}/terminals/{terminal}/ticket")
    public ResponseEntity<Ticket> ticket(@PathVariable String id, @PathVariable String terminal) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tickets.issue(service.get(id), service.terminal(id, terminal), access.expiresAt()));
    }
    @GetMapping("/api/workspace-runner/credentials/{id}")
    public ResponseEntity<Credential> credential(@RequestHeader(value = "X-Runner-Token", required = false) String token, @PathVariable String id) {
        access.runner(token);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.runnerCredential(id));
    }
}
