package com.devhub.backend.workspace;

import static com.devhub.backend.workspace.WorkspaceModels.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WorkspaceRepository {
    private final JdbcTemplate jdbc;
    public WorkspaceRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void lockProject(long id) {
        jdbc.queryForObject("SELECT id FROM projects WHERE id = ? FOR UPDATE", Long.class, id);
    }
    public void lockWorkspace(String id) {
        jdbc.queryForObject("SELECT id FROM workspaces WHERE id = ? FOR UPDATE", String.class, id);
    }
    public void lockUser(long userId) {
        jdbc.queryForObject("SELECT id FROM app_users WHERE id = ? FOR UPDATE", Long.class, userId);
    }
    public List<Workspace> list(long userId, Long projectId) {
        return jdbc.query("SELECT * FROM workspaces WHERE owner_id = ? AND status <> 'DELETED'"
                + (projectId == null ? "" : " AND project_id = ?") + " ORDER BY created_at DESC",
                WorkspaceRepository::map, projectId == null ? new Object[]{userId} : new Object[]{userId, projectId});
    }
    public Optional<Workspace> find(String id) {
        return jdbc.query("SELECT * FROM workspaces WHERE id = ?", WorkspaceRepository::map, id).stream().findFirst();
    }
    public void insert(Workspace w) {
        jdbc.update("""
                INSERT INTO workspaces (id, project_id, owner_id, active_key, repository_url, branch,
                    new_branch, commit_name, commit_email, status, desired, authorized_until)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PROVISIONING', 'RUNNING', ?)
                """, w.id(), w.projectId(), w.ownerId(), w.ownerId() + ":" + w.projectId(), w.repositoryUrl(),
                w.branch(), w.newBranch(), w.commitName(), w.commitEmail(), Timestamp.from(w.authorizedUntil()));
    }
    public boolean hasRunning(long owner, String except) { return countRunning(owner, except) > 0; }
    public long countRunning(long owner, String except) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM workspaces WHERE owner_id = ? AND id <> ? AND desired = 'RUNNING'",
                Long.class, owner, except);
    }
    public void renew(String id, Instant until) {
        jdbc.update("UPDATE workspaces SET authorized_until = ? WHERE id = ?", Timestamp.from(until), id);
    }
    public void deletion(String id, boolean discard) {
        jdbc.update("UPDATE workspaces SET delete_discard = ? WHERE id = ?", discard, id);
        desired(id, "DELETED");
    }
    public boolean discard(String id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT delete_discard FROM workspaces WHERE id = ?", Boolean.class, id));
    }
    public void desired(String id, String state) {
        jdbc.update("""
                UPDATE workspaces SET desired = ?, status = ?, generation = generation + 1,
                    error = '', lease_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status <> 'DELETED'
                """, state, switch (state) { case "RUNNING" -> "PROVISIONING"; case "STOPPED" -> "STOPPING"; default -> "DELETING"; }, id);
    }
    public List<Workspace> reconcileCandidates() {
        return jdbc.query("SELECT * FROM workspaces WHERE status <> 'DELETED' AND status <> 'ERROR' AND (status <> desired OR status = 'RUNNING') ORDER BY updated_at LIMIT 100", WorkspaceRepository::map);
    }
    public boolean claim(Workspace w) {
        return jdbc.update("""
                UPDATE workspaces SET lease_until = ? WHERE id = ? AND generation = ?
                    AND (lease_until IS NULL OR lease_until < CURRENT_TIMESTAMP)
                """, Timestamp.from(Instant.now().plusSeconds(180)), w.id(), w.generation()) == 1;
    }
    public void complete(Workspace w, String status, String error) {
        jdbc.update("""
                UPDATE workspaces SET status = ?, error = ?, lease_until = NULL,
                    active_key = CASE WHEN ? = 'DELETED' THEN NULL ELSE active_key END,
                    updated_at = CURRENT_TIMESTAMP WHERE id = ? AND generation = ?
                """, status, error, status, w.id(), w.generation());
    }
    public boolean projectHasWorkspaces(long projectId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM workspaces WHERE project_id = ? AND status <> 'DELETED'",
                Long.class, projectId) > 0;
    }
    public void purgeDeleted(long projectId) {
        jdbc.update("DELETE FROM workspace_terminals WHERE workspace_id IN (SELECT id FROM workspaces WHERE project_id = ? AND status = 'DELETED')", projectId);
        jdbc.update("DELETE FROM workspaces WHERE project_id = ? AND status = 'DELETED'", projectId);
    }
    public List<Profile> profiles(long owner) {
        return jdbc.query("SELECT * FROM ai_profiles WHERE owner_id = ? ORDER BY provider, name",
                (r, n) -> new Profile(r.getString("id"), r.getString("provider"), r.getString("name"), r.getTimestamp("created_at").toInstant()), owner);
    }
    public Profile profile(String id, long owner) {
        return profiles(owner).stream().filter(p -> p.id().equals(id)).findFirst()
                .orElseThrow(() -> new com.devhub.backend.exception.ResourceNotFoundException("Profile was not found"));
    }
    public void insertProfile(String id, long owner, String provider, String name) {
        jdbc.update("INSERT INTO ai_profiles (id, owner_id, provider, name) VALUES (?, ?, ?, ?)", id, owner, provider, name);
    }
    public boolean profileUsed(String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM workspace_terminals WHERE profile_id = ?", Long.class, id) > 0;
    }
    public void deleteProfile(String id, long owner) {
        jdbc.update("DELETE FROM ai_profiles WHERE id = ? AND owner_id = ?", id, owner);
    }
    public List<Terminal> terminals(String workspaceId) {
        return jdbc.query("SELECT * FROM workspace_terminals WHERE workspace_id = ? ORDER BY created_at",
                (r, n) -> new Terminal(r.getString("id"), r.getString("workspace_id"), r.getString("provider"), r.getString("profile_id")), workspaceId);
    }
    public void insertTerminal(Terminal t) {
        jdbc.update("INSERT INTO workspace_terminals (id, workspace_id, provider, profile_id) VALUES (?, ?, ?, ?)",
                t.id(), t.workspaceId(), t.provider(), t.profileId());
    }
    public void deleteTerminal(String id) { jdbc.update("DELETE FROM workspace_terminals WHERE id = ?", id); }
    public void clearTerminals(String id) { jdbc.update("DELETE FROM workspace_terminals WHERE workspace_id = ?", id); }
    private static Workspace map(ResultSet r, int n) throws SQLException {
        return new Workspace(r.getString("id"), r.getLong("project_id"), r.getLong("owner_id"), r.getString("repository_url"),
                r.getString("branch"), r.getBoolean("new_branch"), r.getString("commit_name"), r.getString("commit_email"),
                r.getString("status"), r.getString("desired"), r.getLong("generation"), r.getString("error"),
                r.getTimestamp("authorized_until").toInstant(), r.getTimestamp("created_at").toInstant(), r.getTimestamp("updated_at").toInstant());
    }
}
