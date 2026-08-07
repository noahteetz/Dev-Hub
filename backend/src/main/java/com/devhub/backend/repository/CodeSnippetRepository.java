package com.devhub.backend.repository;

import com.devhub.backend.model.CodeSnippet;
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
public class CodeSnippetRepository {

	private static final String SELECT_COLUMNS = """
			SELECT id, project_id, title, language, source_code, created_at, updated_at
			FROM code_snippets
			""";

	private final JdbcTemplate jdbcTemplate;

	public CodeSnippetRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public CodeSnippet create(long projectId, String title, String language, String code) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO code_snippets (project_id, title, language, source_code) VALUES (?, ?, ?, ?)",
					new String[]{"id"}
			);
			statement.setLong(1, projectId);
			statement.setString(2, title);
			statement.setString(3, language);
			statement.setString(4, code);
			return statement;
		}, keyHolder);

		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("The database did not return the new code snippet id");
		}

		return findById(projectId, key.longValue())
				.orElseThrow(() -> new IllegalStateException("The new code snippet could not be read"));
	}

	public List<CodeSnippet> findAllByProjectId(long projectId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ? ORDER BY id DESC",
				CodeSnippetRepository::mapRow,
				projectId
		);
	}

	public Optional<CodeSnippet> findById(long projectId, long snippetId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ? AND id = ?",
				CodeSnippetRepository::mapRow,
				projectId,
				snippetId
		).stream().findFirst();
	}

	public int update(long projectId, long snippetId, String title, String language, String code) {
		return jdbcTemplate.update(
				"""
				UPDATE code_snippets
				SET title = ?, language = ?, source_code = ?, updated_at = CURRENT_TIMESTAMP
				WHERE project_id = ? AND id = ?
				""",
				title,
				language,
				code,
				projectId,
				snippetId
		);
	}

	public int delete(long projectId, long snippetId) {
		return jdbcTemplate.update(
				"DELETE FROM code_snippets WHERE project_id = ? AND id = ?",
				projectId,
				snippetId
		);
	}

	private static CodeSnippet mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		return new CodeSnippet(
				resultSet.getLong("id"),
				resultSet.getLong("project_id"),
				resultSet.getString("title"),
				resultSet.getString("language"),
				resultSet.getString("source_code"),
				resultSet.getTimestamp("created_at").toInstant(),
				resultSet.getTimestamp("updated_at").toInstant()
		);
	}
}
