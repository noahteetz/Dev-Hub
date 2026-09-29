package com.devhub.backend.repository;

import com.devhub.backend.model.Project;
import com.devhub.backend.model.ProjectLink;
import com.devhub.backend.model.ProjectRole;
import com.devhub.backend.model.ProjectStatus;
import com.devhub.backend.security.CurrentUser;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class ProjectRepository {

	// The two placeholders are the current user: their membership and their personal favorite.
	private static final String SELECT_COLUMNS = """
			SELECT p.id, p.name, p.description, p.status, p.priority, COALESCE(us.favorite, FALSE) AS favorite,
					p.repository_url, p.deployment_url, p.progress_summary, p.next_step, p.blockers,
					p.start_command, p.build_command, p.technical_decisions, p.context_updated_at,
					p.status_before_archive, p.archived_at, p.archive_reason, p.created_at, p.updated_at, rm.last_commit_at,
					m.role AS member_role, COALESCE(NULLIF(o.display_name, ''), o.username) AS owner_name,
					EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id) AS has_members
				FROM projects p
				JOIN app_users o ON o.id = p.owner_id
				LEFT JOIN repository_metadata rm ON rm.project_id = p.id
				LEFT JOIN project_members m ON m.project_id = p.id AND m.user_id = ?
				LEFT JOIN project_user_settings us ON us.project_id = p.id AND us.user_id = ?
			""";

	private static final String VISIBLE = " (p.owner_id = ? OR m.user_id IS NOT NULL)";

	private final JdbcTemplate jdbcTemplate;
	private final CurrentUser currentUser;
	private final int staleProjectDays;

	public ProjectRepository(
			JdbcTemplate jdbcTemplate,
			CurrentUser currentUser,
			@Value("${devhub.stale-project-days:30}") int staleProjectDays
	) {
		this.jdbcTemplate = jdbcTemplate;
		this.currentUser = currentUser;
		this.staleProjectDays = staleProjectDays;
	}

	public Project create(String name, String description) {
		return create(name, description, "", "", List.of());
	}

	public Project create(
			String name,
			String description,
			String repositoryUrl,
			String deploymentUrl,
			List<ProjectLink> links
	) {
		long ownerId = currentUser.id();
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO projects (owner_id, name, description, repository_url, deployment_url) VALUES (?, ?, ?, ?, ?)",
					new String[]{"id"}
			);
			statement.setLong(1, ownerId);
			statement.setString(2, name);
			statement.setString(3, description);
			statement.setString(4, repositoryUrl);
			statement.setString(5, deploymentUrl);
			return statement;
		}, keyHolder);

		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("The database did not return the new project id");
		}
		replaceLinks(key.longValue(), links);

		return findById(key.longValue())
				.orElseThrow(() -> new IllegalStateException("The new project could not be read"));
	}

	public List<Project> findAll() {
		return findAll(false);
	}

	public List<Project> findAll(boolean archived) {
		String filter = archived ? " AND p.status = 'ARCHIVED'" : " AND p.status <> 'ARCHIVED'";
		long me = currentUser.id();
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE" + VISIBLE + filter + " ORDER BY COALESCE(us.favorite, FALSE) DESC, p.priority DESC, COALESCE(rm.last_commit_at, p.context_updated_at, p.created_at) DESC, p.id DESC",
				this::mapRow,
				me,
				me,
				me
		).stream().map(this::withLinks).toList();
	}

	/** A project the current user owns or is a member of. */
	public Optional<Project> findById(long id) {
		long me = currentUser.id();
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE p.id = ? AND" + VISIBLE,
				this::mapRow,
				me,
				me,
				id,
				me
		).stream().findFirst().map(this::withLinks);
	}

	public int update(
			long id,
			String name,
			String description,
			String repositoryUrl,
			String deploymentUrl,
			List<ProjectLink> links
	) {
		int updated = jdbcTemplate.update(
				"UPDATE projects SET name = ?, description = ?, repository_url = ?, deployment_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?",
				name,
				description,
				repositoryUrl,
				deploymentUrl,
				id,
				currentUser.id()
		);
		if (updated > 0) {
			replaceLinks(id, links);
		}
		return updated;
	}

	public int updateOrganization(long id, ProjectStatus status, int priority) {
		return jdbcTemplate.update(
			"UPDATE projects SET status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?",
				status.name(),
				priority,
				id,
				currentUser.id()
		);
	}

	/** The favorite mark belongs to the current user, not to the project. */
	public void setFavorite(long projectId, boolean favorite) {
		long me = currentUser.id();
		jdbcTemplate.update(
				"INSERT INTO project_user_settings (project_id, user_id, favorite) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
				projectId,
				me,
				favorite
		);
		jdbcTemplate.update(
				"UPDATE project_user_settings SET favorite = ? WHERE project_id = ? AND user_id = ?",
				favorite,
				projectId,
				me
		);
	}

	public int updateContext(
			long id,
			String progressSummary,
			String nextStep,
			String blockers,
			String startCommand,
			String buildCommand,
			String technicalDecisions
	) {
		return jdbcTemplate.update(
			"UPDATE projects SET progress_summary = ?, next_step = ?, blockers = ?, start_command = ?, build_command = ?, technical_decisions = ?, context_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
				progressSummary,
				nextStep,
				blockers,
				startCommand,
				buildCommand,
				technicalDecisions,
				id
		);
	}

	public int archive(long id, String reason, ProjectStatus previousStatus) {
		return jdbcTemplate.update(
			"UPDATE projects SET status_before_archive = ?, status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP, archive_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ? AND status <> 'ARCHIVED'",
				previousStatus.name(),
				reason,
				id,
				currentUser.id()
		);
	}

	public int restore(long id, ProjectStatus restoredStatus) {
		return jdbcTemplate.update(
			"UPDATE projects SET status = ?, status_before_archive = NULL, archived_at = NULL, archive_reason = '', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ? AND status = 'ARCHIVED'",
				restoredStatus.name(),
				id,
				currentUser.id()
		);
	}

	public int deleteById(long id) {
		return jdbcTemplate.update("DELETE FROM projects WHERE id = ? AND owner_id = ?", id, currentUser.id());
	}

	private void replaceLinks(long projectId, List<ProjectLink> links) {
		jdbcTemplate.update("DELETE FROM project_links WHERE project_id = ?", projectId);
		for (ProjectLink link : links) {
			jdbcTemplate.update(
					"INSERT INTO project_links (project_id, label, url, link_order) VALUES (?, ?, ?, ?)",
					projectId,
					link.label(),
					link.url(),
					link.order()
			);
		}
	}

	private Project withLinks(Project project) {
		List<ProjectLink> links = jdbcTemplate.query(
				"SELECT id, project_id, label, url, link_order FROM project_links WHERE project_id = ? ORDER BY link_order",
				(resultSet, rowNumber) -> new ProjectLink(
						resultSet.getLong("id"),
						resultSet.getLong("project_id"),
						resultSet.getString("label"),
						resultSet.getString("url"),
						resultSet.getInt("link_order")
				),
				project.id()
		);
		return new Project(
				project.id(),
				project.name(),
				project.description(),
				project.status(),
				project.priority(),
				project.favorite(),
				project.statusBeforeArchive(),
				project.repositoryUrl(),
				project.deploymentUrl(),
				project.progressSummary(),
				project.nextStep(),
				project.blockers(),
				project.startCommand(),
				project.buildCommand(),
				project.technicalDecisions(),
				project.contextUpdatedAt(),
				project.archivedAt(),
				project.archiveReason(),
				links,
				project.createdAt(),
				project.updatedAt(),
				project.effectiveActivityAt(),
				project.stale(),
				project.role(),
				project.ownerName(),
				project.shared()
		);
	}

	private Project mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		Instant createdAt = resultSet.getTimestamp("created_at").toInstant();
		Instant contextUpdatedAt = toInstant(resultSet.getTimestamp("context_updated_at"));
		Instant repositoryActivityAt = toInstant(resultSet.getTimestamp("last_commit_at"));
		String memberRole = resultSet.getString("member_role");
		ProjectRole role = memberRole == null ? ProjectRole.OWNER : ProjectRole.valueOf(memberRole);
		Instant effectiveActivityAt = createdAt;
		if (contextUpdatedAt != null && contextUpdatedAt.isAfter(effectiveActivityAt)) {
			effectiveActivityAt = contextUpdatedAt;
		}
		if (repositoryActivityAt != null && repositoryActivityAt.isAfter(effectiveActivityAt)) {
			effectiveActivityAt = repositoryActivityAt;
		}
		return new Project(
				resultSet.getLong("id"),
				resultSet.getString("name"),
				resultSet.getString("description"),
				ProjectStatus.valueOf(resultSet.getString("status")),
				resultSet.getInt("priority"),
				resultSet.getBoolean("favorite"),
				toStatus(resultSet.getString("status_before_archive")),
				resultSet.getString("repository_url"),
				resultSet.getString("deployment_url"),
				resultSet.getString("progress_summary"),
				resultSet.getString("next_step"),
				resultSet.getString("blockers"),
				resultSet.getString("start_command"),
				resultSet.getString("build_command"),
				resultSet.getString("technical_decisions"),
				contextUpdatedAt,
				toInstant(resultSet.getTimestamp("archived_at")),
				resultSet.getString("archive_reason"),
				List.of(),
				createdAt,
				resultSet.getTimestamp("updated_at").toInstant(),
				effectiveActivityAt,
				effectiveActivityAt.isBefore(Instant.now().minusSeconds(staleProjectDays * 86400L)),
				role,
				resultSet.getString("owner_name"),
				role != ProjectRole.OWNER || resultSet.getBoolean("has_members")
		);
	}

	private static ProjectStatus toStatus(String value) {
		return value == null ? null : ProjectStatus.valueOf(value);
	}

	private static Instant toInstant(Timestamp timestamp) {
		return timestamp == null ? null : timestamp.toInstant();
	}
}
