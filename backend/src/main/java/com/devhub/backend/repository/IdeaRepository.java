package com.devhub.backend.repository;

import com.devhub.backend.model.Idea;
import com.devhub.backend.model.Tag;
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
public class IdeaRepository {

	private static final String SELECT_COLUMNS = """
			SELECT id, project_id, title, content, converted, converted_todo_id, created_at, updated_at
			FROM ideas
			""";

	private final JdbcTemplate jdbcTemplate;
	private final CurrentUser currentUser;

	public IdeaRepository(JdbcTemplate jdbcTemplate, CurrentUser currentUser) {
		this.jdbcTemplate = jdbcTemplate;
		this.currentUser = currentUser;
	}

	public Idea create(long projectId, String title, String content) {
		long ownerId = currentUser.id();
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO ideas (owner_id, project_id, title, content) VALUES (?, ?, ?, ?)",
					new String[]{"id"}
			);
			statement.setLong(1, ownerId);
			statement.setLong(2, projectId);
			statement.setString(3, title);
			statement.setString(4, content);
			return statement;
		}, keyHolder);

		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("The database did not return the new idea id");
		}
		return findById(projectId, key.longValue())
				.orElseThrow(() -> new IllegalStateException("The new idea could not be read"));
	}

	public List<Idea> findAllByProjectId(long projectId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ? AND owner_id = ? ORDER BY id DESC",
				IdeaRepository::mapRow,
				projectId,
				currentUser.id()
		);
	}

	public Optional<Idea> findById(long projectId, long ideaId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ? AND id = ? AND owner_id = ?",
				IdeaRepository::mapRow,
				projectId,
				ideaId,
				currentUser.id()
		).stream().findFirst();
	}

	public int update(long projectId, long ideaId, String title, String content) {
		return jdbcTemplate.update("""
				UPDATE ideas
				SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
				WHERE project_id = ? AND id = ? AND owner_id = ?
				""", title, content, projectId, ideaId, currentUser.id());
	}

	public int markConverted(long projectId, long ideaId, long todoId) {
		return jdbcTemplate.update("""
				UPDATE ideas
				SET converted = TRUE, converted_todo_id = ?, updated_at = CURRENT_TIMESTAMP
				WHERE project_id = ? AND id = ? AND owner_id = ? AND converted = FALSE
				""", todoId, projectId, ideaId, currentUser.id());
	}

	public int delete(long projectId, long ideaId) {
		return jdbcTemplate.update(
				"DELETE FROM ideas WHERE project_id = ? AND id = ? AND owner_id = ?",
				projectId,
				ideaId,
				currentUser.id()
		);
	}

	public List<Tag> findTagsByIdeaId(long ideaId) {
		return jdbcTemplate.query("""
				SELECT tags.id, tags.name
				FROM tags
				JOIN idea_tags ON idea_tags.tag_id = tags.id
				WHERE idea_tags.idea_id = ?
				ORDER BY tags.name
				""", (resultSet, rowNumber) -> new Tag(
					resultSet.getLong("id"),
					resultSet.getString("name")
			), ideaId);
	}

	public void replaceTags(long ideaId, List<Tag> tags) {
		jdbcTemplate.update("DELETE FROM idea_tags WHERE idea_id = ?", ideaId);
		for (Tag tag : tags) {
			jdbcTemplate.update(
					"INSERT INTO idea_tags (idea_id, tag_id) VALUES (?, ?)",
					ideaId,
					tag.id()
			);
		}
	}

	private static Idea mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		long convertedTodoId = resultSet.getLong("converted_todo_id");
		return new Idea(
				resultSet.getLong("id"),
				resultSet.getLong("project_id"),
				resultSet.getString("title"),
				resultSet.getString("content"),
				resultSet.getBoolean("converted"),
				resultSet.wasNull() ? null : convertedTodoId,
				List.of(),
				resultSet.getTimestamp("created_at").toInstant(),
				resultSet.getTimestamp("updated_at").toInstant()
		);
	}
}