package com.devhub.backend.workspace;

import java.time.Instant;
import java.util.List;

public final class WorkspaceModels {
    private WorkspaceModels() {}
    public record Workspace(String id, long projectId, long ownerId, String repositoryUrl,
            String branch, boolean newBranch, String commitName, String commitEmail,
            String status, String desired, long generation, String error, Instant authorizedUntil,
            Instant createdAt, Instant updatedAt) {}
    public record Profile(String id, String provider, String name, Instant createdAt) {}
    public record Terminal(String id, String workspaceId, String provider, String profileId) {}
    public record Create(String branch, boolean newBranch, String commitName, String commitEmail) {}
    public record ProfileInput(String provider, String name) {}
    public record TerminalInput(String provider, String profileId) {}
    public record DeleteInput(boolean discard, String confirmation) {}
    public record Ticket(String ticket, Instant expiresAt) {}
    public record Config(boolean enabled, boolean allowed, int maxRunning, int maxWorkspaces) {}
    public record RunnerStart(String id, long ownerId, String repositoryUrl, String branch,
            boolean newBranch, String commitName, String commitEmail, long generation) {}
    public record RunnerAction(long generation, boolean discard, String confirmation) {}
    public record RunnerTerminal(String id, long ownerId, String provider, String profileId) {}
    public record Runtime(String status, long memoryBytes, double cpuPercent, long diskBytes,
            Instant lastActivityAt, String reason) {}
    public record GitReport(boolean safe, boolean known, String branch, List<String> warnings,
            List<String> changedFiles, List<String> unpushedBranches) {}
    public record Credential(String username, String password) {
        @Override public String toString() { return "Credential[username=" + username + ", password=***]"; }
    }
}
