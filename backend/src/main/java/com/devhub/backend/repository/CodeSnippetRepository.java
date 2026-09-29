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
			SELECT id, project_id, title, language, source_code, created_at, updated_at,
					(SELECT COALESCE(NULLIF(u.display_name, ''), u.username) FROM app_users u WHERE u.id = code_snippets.created_by) AS created_by_name
			FROM code_snippets
			""";

	private final JdbcTemplate jdbcTemplate;
	private final CurrentUser currentUser;

	public CodeSnippetRepository(JdbcTemplate jdbcTemplate, CurrentUser currentUser) {
		this.jdbcTemplate = jdbcTemplate;
		this.currentUser = currentUser;
	}

	/** The snippet belongs to the project owner's data; the current user is recorded as its author. */
	public CodeSnippet create(long ownerId, long projectId, String title, String language, String code) {
		long authorId = currentUser.id();
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO code_snippets (owner_id, created_by, project_id, title, language, source_code) VALUES (?, ?, ?, ?, ?, ?)",
					new String[]{"id"}
			);
			statement.setLong(1, ownerId);
			statement.setLong(2, authorId);
			statement.setLong(3, projectId);
			statement.setString(4, title);
			statement.setString(5, language);
			statement.setString(6, code);
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
				resultSet.getTimestamp("updated_at").toInstant(),
				resultSet.getString("created_by_name")
		);
	}
}
