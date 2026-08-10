package com.devhub.backend.repository;

import com.devhub.backend.model.Project;
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
			SELECT id, name, description, is_system, created_at, updated_at
			FROM projects
			""";

	private final JdbcTemplate jdbcTemplate;

	public ProjectRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public Project create(String name, String description) {
		return create(name, description, false);
	}

	public Project create(String name, String description, boolean system) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO projects (name, description, is_system) VALUES (?, ?, ?)",
					new String[]{"id"}
			);
			statement.setString(1, name);
			statement.setString(2, description);
			statement.setBoolean(3, system);
			return statement;
		}, keyHolder);

		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("The database did not return the new project id");
		}

		return findById(key.longValue())
				.orElseThrow(() -> new IllegalStateException("The new project could not be read"));
	}

	public List<Project> findAll() {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " ORDER BY is_system DESC, id DESC",
				ProjectRepository::mapRow
		);
	}

	public List<Project> findSystemProjects() {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE is_system = TRUE",
				ProjectRepository::mapRow
		);
	}

	public Optional<Project> findById(long id) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE id = ?",
				ProjectRepository::mapRow,
				id
		).stream().findFirst();
	}

	public int update(long id, String name, String description) {
		return jdbcTemplate.update(
				"UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
				name,
				description,
				id
		);
	}

	public int deleteById(long id) {
		return jdbcTemplate.update("DELETE FROM projects WHERE id = ?", id);
	}

	private static Project mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		return new Project(
				resultSet.getLong("id"),
				resultSet.getString("name"),
				resultSet.getString("description"),
				resultSet.getBoolean("is_system"),
				resultSet.getTimestamp("created_at").toInstant(),
				resultSet.getTimestamp("updated_at").toInstant()
		);
	}
}
