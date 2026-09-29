package com.devhub.backend.repository;

import com.devhub.backend.model.Tag;
import com.devhub.backend.model.Todo;
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
public class TodoRepository {

	private static final String SELECT_COLUMNS = """
			SELECT id, project_id, title, content, completed, completed_at, created_at, updated_at,
					(SELECT COALESCE(NULLIF(u.display_name, ''), u.username) FROM app_users u WHERE u.id = todos.created_by) AS created_by_name
			FROM todos
			""";

	private final JdbcTemplate jdbcTemplate;
	private final CurrentUser currentUser;

	public TodoRepository(JdbcTemplate jdbcTemplate, CurrentUser currentUser) {
		this.jdbcTemplate = jdbcTemplate;
		this.currentUser = currentUser;
	}

	/** The todo belongs to the project owner's data; the current user is recorded as its author. */
	public Todo create(long ownerId, long projectId, String title, String content) {
		long authorId = currentUser.id();
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO todos (owner_id, created_by, project_id, title, content) VALUES (?, ?, ?, ?, ?)",
					new String[]{"id"}
			);
			statement.setLong(1, ownerId);
			statement.setLong(2, authorId);
			statement.setLong(3, projectId);
			statement.setString(4, title);
			statement.setString(5, content);
			return statement;
		}, keyHolder);

		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("The database did not return the new todo id");
		}
		return findById(projectId, key.longValue())
				.orElseThrow(() -> new IllegalStateException("The new todo could not be read"));
	}

	public List<Todo> findAllByProjectId(long projectId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ? ORDER BY completed ASC, id DESC",
				TodoRepository::mapRow,
				projectId
		);
	}

	public Optional<Todo> findById(long projectId, long todoId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ? AND id = ?",
				TodoRepository::mapRow,
				projectId,
				todoId
		).stream().findFirst();
	}

	public int update(long projectId, long todoId, String title, String content) {
		return jdbcTemplate.update("""
				UPDATE todos
				SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
				WHERE project_id = ? AND id = ?
				""", title, content, projectId, todoId);
	}

	public int setCompleted(long projectId, long todoId, boolean completed) {
		return jdbcTemplate.update("""
				UPDATE todos
				SET completed = ?,
					completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END,
					updated_at = CURRENT_TIMESTAMP
				WHERE project_id = ? AND id = ?
				""", completed, completed, projectId, todoId);
	}

	public int delete(long projectId, long todoId) {
		return jdbcTemplate.update(
				"DELETE FROM todos WHERE project_id = ? AND id = ?",
				projectId,
				todoId
		);
	}

	public List<Tag> findTagsByTodoId(long todoId) {
		return jdbcTemplate.query("""
				SELECT tags.id, tags.name
				FROM tags
				JOIN todo_tags ON todo_tags.tag_id = tags.id
				WHERE todo_tags.todo_id = ?
				ORDER BY tags.name
				""", (resultSet, rowNumber) -> new Tag(
					resultSet.getLong("id"),
					resultSet.getString("name")
			), todoId);
	}

	public void replaceTags(long todoId, List<Tag> tags) {
		jdbcTemplate.update("DELETE FROM todo_tags WHERE todo_id = ?", todoId);
		for (Tag tag : tags) {
			jdbcTemplate.update(
					"INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)",
					todoId,
					tag.id()
			);
		}
	}

	private static Todo mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		java.sql.Timestamp completedAt = resultSet.getTimestamp("completed_at");
		return new Todo(
				resultSet.getLong("id"),
				resultSet.getLong("project_id"),
				resultSet.getString("title"),
				resultSet.getString("content"),
				resultSet.getBoolean("completed"),
				completedAt == null ? null : completedAt.toInstant(),
				List.of(),
				resultSet.getTimestamp("created_at").toInstant(),
				resultSet.getTimestamp("updated_at").toInstant(),
				resultSet.getString("created_by_name")
		);
	}
}