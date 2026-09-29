package com.devhub.backend.repository;

import com.devhub.backend.model.ProjectAccess;
import com.devhub.backend.model.ProjectMember;
import com.devhub.backend.model.ProjectRole;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ProjectMemberRepository {

	private static final String DISPLAY = "COALESCE(NULLIF(u.display_name, ''), u.username)";

	private final JdbcTemplate jdbcTemplate;

	public ProjectMemberRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/** The user's standing in the project, or empty when they neither own it nor are a member. */
	public Optional<ProjectAccess> findAccess(long projectId, long userId) {
		return jdbcTemplate.query(
				"""
				SELECT p.id, p.owner_id, m.role
					FROM projects p
					LEFT JOIN project_members m ON m.project_id = p.id AND m.user_id = ?
					WHERE p.id = ? AND (p.owner_id = ? OR m.user_id IS NOT NULL)
				""",
				(resultSet, rowNumber) -> {
					String role = resultSet.getString("role");
					return new ProjectAccess(
							resultSet.getLong("id"),
							resultSet.getLong("owner_id"),
							role == null ? ProjectRole.OWNER : ProjectRole.valueOf(role)
					);
				},
				userId,
				projectId,
				userId
		).stream().findFirst();
	}

	public List<ProjectMember> findMembers(long projectId) {
		return jdbcTemplate.query(
				"""
				SELECT u.id, u.username, %s AS display, m.role, m.created_at
					FROM project_members m
					JOIN app_users u ON u.id = m.user_id
					WHERE m.project_id = ?
					ORDER BY m.created_at, u.id
				""".formatted(DISPLAY),
				ProjectMemberRepository::mapRow,
				projectId
		);
	}

	public boolean exists(long projectId, long userId) {
		Integer count = jdbcTemplate.queryForObject(
				"SELECT COUNT(*) FROM project_members WHERE project_id = ? AND user_id = ?",
				Integer.class,
				projectId,
				userId
		);
		return count != null && count > 0;
	}

	public void add(long projectId, long userId, ProjectRole role, long addedBy) {
		jdbcTemplate.update(
				"INSERT INTO project_members (project_id, user_id, role, added_by) VALUES (?, ?, ?, ?)",
				projectId,
				userId,
				role.name(),
				addedBy
		);
	}

	public int updateRole(long projectId, long userId, ProjectRole role) {
		return jdbcTemplate.update(
				"UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?",
				role.name(),
				projectId,
				userId
		);
	}

	public int remove(long projectId, long userId) {
		return jdbcTemplate.update("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", projectId, userId);
	}

	private static ProjectMember mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		return new ProjectMember(
				resultSet.getLong("id"),
				resultSet.getString("username"),
				resultSet.getString("display"),
				ProjectRole.valueOf(resultSet.getString("role")),
				resultSet.getTimestamp("created_at").toInstant()
		);
	}
}
