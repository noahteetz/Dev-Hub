package com.devhub.backend.workspace;

import com.devhub.backend.exception.ForbiddenException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class TerminalTickets {
    public record Grant(String workspaceId, String terminalId, long ownerId, Instant tokenExpiresAt, Instant ticketExpiresAt) {}
    private final ConcurrentHashMap<String, Grant> grants = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final WorkspaceRepository repository;
    private final WorkspaceAccess access;
    public TerminalTickets(WorkspaceRepository repository, WorkspaceAccess access) { this.repository = repository; this.access = access; }
    public WorkspaceModels.Ticket issue(WorkspaceModels.Workspace w, WorkspaceModels.Terminal t, Instant tokenExpiry) {
        var now = Instant.now(); grants.entrySet().removeIf(e -> !e.getValue().ticketExpiresAt().isAfter(now));
        if (!w.status().equals("RUNNING") || !w.desired().equals("RUNNING") || !tokenExpiry.isAfter(now))
            throw new ForbiddenException("Workspace terminal is not authorized");
        if (grants.size() >= 5000 || grants.values().stream().filter(g -> g.ownerId() == w.ownerId()).count() >= 20)
            throw new ForbiddenException("Too many pending terminal connections");
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String ticket = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires = now.plusSeconds(30).isBefore(tokenExpiry) ? now.plusSeconds(30) : tokenExpiry;
        grants.put(ticket, new Grant(w.id(), t.id(), w.ownerId(), tokenExpiry, expires));
        return new WorkspaceModels.Ticket(ticket, expires);
    }
    public Grant consume(String ticket, String workspace, String terminal) {
        Grant g = ticket == null ? null : grants.remove(ticket);
        if (g == null || !g.workspaceId().equals(workspace) || !g.terminalId().equals(terminal)
                || !g.ticketExpiresAt().isAfter(Instant.now())) throw new ForbiddenException("Invalid or expired terminal ticket");
        check(g); return g;
    }
    public void check(Grant g) {
        if (!g.tokenExpiresAt().isAfter(Instant.now())) throw new ForbiddenException("Terminal authorization expired");
        var w = repository.find(g.workspaceId()).orElseThrow(() -> new ForbiddenException("Workspace unavailable"));
        if (w.ownerId() != g.ownerId() || !w.status().equals("RUNNING") || !w.desired().equals("RUNNING")
                || repository.terminals(w.id()).stream().noneMatch(t -> t.id().equals(g.terminalId())))
            throw new ForbiddenException("Terminal is no longer authorized");
        access.project(w.projectId(), g.ownerId());
    }
}
