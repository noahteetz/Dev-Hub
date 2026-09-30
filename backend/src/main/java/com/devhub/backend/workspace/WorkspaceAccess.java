package com.devhub.backend.workspace;

import com.devhub.backend.exception.ForbiddenException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Permission;
import com.devhub.backend.repository.ProjectMemberRepository;
import com.devhub.backend.security.AuthProperties;
import com.devhub.backend.security.CurrentUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class WorkspaceAccess {
    private final WorkspaceSettings settings;
    private final AuthProperties auth;
    private final CurrentUser currentUser;
    private final ProjectMemberRepository members;
    public WorkspaceAccess(WorkspaceSettings settings, AuthProperties auth, CurrentUser currentUser, ProjectMemberRepository members) {
        this.settings = settings; this.auth = auth; this.currentUser = currentUser; this.members = members;
    }
    public boolean allowed() {
        if (!settings.enabled) return false;
        if (!auth.isEnabled()) return true;
        if (!(SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken a)) return false;
        Map<String, Object> realm = a.getToken().getClaimAsMap("realm_access");
        return realm != null && realm.get("roles") instanceof Collection<?> roles && roles.contains("devhub-workspace");
    }
    public void feature() {
        if (!settings.enabled) throw new ResourceNotFoundException("Remote workspaces are disabled");
        if (!allowed()) throw new ForbiddenException("Your account needs the devhub-workspace realm role");
    }
    public Instant expiresAt() {
        if (!auth.isEnabled()) return Instant.now().plusSeconds(300);
        var a = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        Instant expiry = a.getToken().getExpiresAt();
        if (expiry == null || !expiry.isAfter(Instant.now())) throw new ForbiddenException("Sign in again");
        return expiry;
    }
    public void project(long projectId, long userId) {
        var p = members.findAccess(projectId, userId).orElseThrow(() -> new ResourceNotFoundException("Project was not found"));
        if (!p.role().allows(Permission.RUN_WORKSPACE)) throw new ForbiddenException("Your project role does not allow a workspace");
    }
    public void own(WorkspaceModels.Workspace w) {
        feature();
        if (w.ownerId() != currentUser.id() || w.status().equals("DELETED")) throw new ResourceNotFoundException("Workspace was not found");
        project(w.projectId(), w.ownerId());
    }
    public void runner(String token) {
        if (!settings.enabled || settings.runnerToken.length() < 32 || token == null
                || !MessageDigest.isEqual(settings.runnerToken.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))) {
            throw new ForbiddenException("Runner authentication failed");
        }
    }
}
