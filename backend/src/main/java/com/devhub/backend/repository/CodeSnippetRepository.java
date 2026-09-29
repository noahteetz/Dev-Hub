package com.devhub.backend.repository;

import com.devhub.backend.model.CodeSnippet;
import com.devhub.backend.security.CurrentUser;
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
	private final CurrentUser currentUser;

	public CodeSnippetRepository(JdbcTemplate jdbcTemplate, CurrentUser currentUser) {
		this.jdbcTemplate = jdbcTemplate;
		this.currentUser = currentUser;
	}

	public CodeSnippet create(long projectId, String title, String language, String code) {
		long ownerId = currentUser.id();
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO code_snippets (owner_id, project_id, title, language, source_code) VALUES (?, ?, ?, ?, ?)",
					new String[]{"id"}
			);
			statement.setLong(1, ownerId);
			statement.setLong(2, projectId);
			statement.setString(3, title);
			statement.setString(4, language);
			statement.setString(5, code);
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
				SELECT_COLUMNS + " WHERE project_id = ? AND owner_id = ? ORDER BY id DESC",
				CodeSnippetRepository::mapRow,
				projectId,
				currentUser.id()
		);
	}

	public Optional<CodeSnippet> findById(long projectId, long snippetId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ? AND id = ? AND owner_id = ?",
				CodeSnippetRepository::mapRow,
				projectId,
				snippetId,
				currentUser.id()
		).stream().findFirst();
	}

	public int update(long projectId, long snippetId, String title, String language, String code) {
		return jdbcTemplate.update(
				"""
				UPDATE code_snippets
				SET title = ?, language = ?, source_code = ?, updated_at = CURRENT_TIMESTAMP
				WHERE project_id = ? AND id = ? AND owner_id = ?
				""",
				title,
				language,
				code,
				projectId,
				snippetId,
				currentUser.id()
		);
	}

	public int delete(long projectId, long snippetId) {
		return jdbcTemplate.update(
				"DELETE FROM code_snippets WHERE project_id = ? AND id = ? AND owner_id = ?",
				projectId,
				snippetId,
				currentUser.id()
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
