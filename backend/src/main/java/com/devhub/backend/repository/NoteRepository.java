package com.devhub.backend.repository;

import com.devhub.backend.model.Note;
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
public class NoteRepository {

	private static final String SELECT_COLUMNS = """
			SELECT id, project_id, title, content, created_at, updated_at
			FROM notes
			""";

	private final JdbcTemplate jdbcTemplate;

	public NoteRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public Note create(long projectId, String title, String content) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO notes (project_id, title, content) VALUES (?, ?, ?)",
					new String[]{"id"}
			);
			statement.setLong(1, projectId);
			statement.setString(2, title);
			statement.setString(3, content);
			return statement;
		}, keyHolder);

		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("The database did not return the new note id");
		}

		return findById(projectId, key.longValue())
				.orElseThrow(() -> new IllegalStateException("The new note could not be read"));
	}

	public List<Note> findAllByProjectId(long projectId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ? ORDER BY id DESC",
				NoteRepository::mapRow,
				projectId
		);
	}

	public Optional<Note> findById(long projectId, long noteId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ? AND id = ?",
				NoteRepository::mapRow,
				projectId,
				noteId
		).stream().findFirst();
	}

	public int update(long projectId, long noteId, String title, String content) {
		return jdbcTemplate.update(
				"""
				UPDATE notes
				SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
				WHERE project_id = ? AND id = ?
				""",
				title,
				content,
				projectId,
				noteId
		);
	}

	public int delete(long projectId, long noteId) {
		return jdbcTemplate.update(
				"DELETE FROM notes WHERE project_id = ? AND id = ?",
				projectId,
				noteId
		);
	}

	private static Note mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		return new Note(
				resultSet.getLong("id"),
				resultSet.getLong("project_id"),
				resultSet.getString("title"),
				resultSet.getString("content"),
				resultSet.getTimestamp("created_at").toInstant(),
				resultSet.getTimestamp("updated_at").toInstant()
		);
	}
}
