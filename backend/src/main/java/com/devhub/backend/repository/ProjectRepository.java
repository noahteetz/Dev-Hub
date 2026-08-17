package com.devhub.backend.repository;

import com.devhub.backend.model.Project;
import com.devhub.backend.model.ProjectLink;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class ProjectRepository {

	private static final String SELECT_COLUMNS = """
			SELECT id, name, description, is_system, repository_url, deployment_url, created_at, updated_at
			FROM projects
			""";

	private final JdbcTemplate jdbcTemplate;

	public ProjectRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public Project create(String name, String description) {
		return create(name, description, false, "", "", List.of());
	}

	public Project create(String name, String description, boolean system) {
		return create(name, description, system, "", "", List.of());
	}

	public Project create(
			String name,
			String description,
			boolean system,
			String repositoryUrl,
			String deploymentUrl,
			List<ProjectLink> links
	) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO projects (name, description, is_system, repository_url, deployment_url) VALUES (?, ?, ?, ?, ?)",
					new String[]{"id"}
			);
			statement.setString(1, name);
			statement.setString(2, description);
			statement.setBoolean(3, system);
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
		return jdbcTemplate.query(
				SELECT_COLUMNS + " ORDER BY is_system DESC, id DESC",
				ProjectRepository::mapRow
		).stream().map(this::withLinks).toList();
	}

	public List<Project> findSystemProjects() {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE is_system = TRUE",
				ProjectRepository::mapRow
		).stream().map(this::withLinks).toList();
	}

	public Optional<Project> findById(long id) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE id = ?",
				ProjectRepository::mapRow,
				id
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
				"UPDATE projects SET name = ?, description = ?, repository_url = ?, deployment_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
				name,
				description,
				repositoryUrl,
				deploymentUrl,
				id
		);
		if (updated > 0) {
			replaceLinks(id, links);
		}
		return updated;
	}

	public int deleteById(long id) {
		return jdbcTemplate.update("DELETE FROM projects WHERE id = ?", id);
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
				project.system(),
				project.repositoryUrl(),
				project.deploymentUrl(),
				links,
				project.createdAt(),
				project.updatedAt()
		);
	}

	private static Project mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		return new Project(
				resultSet.getLong("id"),
				resultSet.getString("name"),
				resultSet.getString("description"),
				resultSet.getBoolean("is_system"),
				resultSet.getString("repository_url"),
				resultSet.getString("deployment_url"),
				List.of(),
				resultSet.getTimestamp("created_at").toInstant(),
				resultSet.getTimestamp("updated_at").toInstant()
		);
	}
}
