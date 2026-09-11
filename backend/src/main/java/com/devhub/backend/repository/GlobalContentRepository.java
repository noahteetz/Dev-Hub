package com.devhub.backend.repository;

import com.devhub.backend.model.ContentEntry;
import com.devhub.backend.model.ContentType;
import com.devhub.backend.model.Tag;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class GlobalContentRepository {
	private final JdbcTemplate jdbc;
	public GlobalContentRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

	public List<ContentEntry> findAll(ContentType type, String scope, Long projectId, Boolean archived, Boolean completed) {
		StringBuilder sql = new StringBuilder(select(type)).append(" WHERE 1 = 1");
		List<Object> args = new ArrayList<>();
		if ("inbox".equals(scope)) sql.append(" AND project_id IS NULL");
		if ("project".equals(scope) && projectId != null) { sql.append(" AND project_id = ?"); args.add(projectId); }
		if (archived != null && type != ContentType.TODO) { sql.append(" AND archived = ?"); args.add(archived); }
		if (completed != null && type == ContentType.TODO) { sql.append(" AND completed = ?"); args.add(completed); }
		sql.append(" ORDER BY created_at DESC, id DESC");
		return jdbc.query(sql.toString(), (rs, row) -> map(type, rs), args.toArray());
	}

	public Optional<ContentEntry> find(ContentType type, long id) {
		return jdbc.query(select(type) + " WHERE id = ?", (rs, row) -> map(type, rs), id).stream().findFirst();
	}

	public ContentEntry create(ContentType type, String title, String content, String language, String sourceUrl) {
		KeyHolder keys = new GeneratedKeyHolder();
		jdbc.update(connection -> {
			String sql = switch (type) {
				case NOTE -> "INSERT INTO notes (project_id, title, content, source_url) VALUES (NULL, ?, ?, ?)";
				case SNIPPET -> "INSERT INTO code_snippets (project_id, title, language, source_code) VALUES (NULL, ?, ?, ?)";
				case IDEA -> "INSERT INTO ideas (project_id, title, content, source_url) VALUES (NULL, ?, ?, ?)";
				case TODO -> "INSERT INTO todos (project_id, title, content) VALUES (NULL, ?, ?)";
			};
			PreparedStatement statement = connection.prepareStatement(sql, new String[]{"id"});
			statement.setString(1, title);
			if (type == ContentType.SNIPPET) {
				statement.setString(2, language); statement.setString(3, content);
			} else {
				statement.setString(2, content);
				if (type == ContentType.NOTE || type == ContentType.IDEA) statement.setString(3, sourceUrl);
			}
			return statement;
		}, keys);
		Number key = keys.getKey();
		if (key == null) throw new IllegalStateException("The database did not return a content id");
		return find(type, key.longValue()).orElseThrow();
	}

	public int assign(ContentType type, long id, Long projectId) {
		return jdbc.update("UPDATE " + table(type) + " SET project_id = ?, filed_at = CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END, updated_at = CURRENT_TIMESTAMP WHERE id = ?", projectId, projectId, id);
	}
	public int archive(ContentType type, long id, boolean archived) {
		if (type == ContentType.TODO) return 0;
		return jdbc.update("UPDATE " + table(type) + " SET archived = ?, archived_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?", archived, archived, id);
	}
	public int delete(ContentType type, long id) { return jdbc.update("DELETE FROM " + table(type) + " WHERE id = ?", id); }
	public int update(ContentType type, long id, String title, String content, String language, String sourceUrl) {
		return switch (type) {
			case NOTE -> jdbc.update("UPDATE notes SET title = ?, content = ?, source_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", title, content, sourceUrl, id);
			case SNIPPET -> jdbc.update("UPDATE code_snippets SET title = ?, source_code = ?, language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", title, content, language, id);
			case IDEA -> jdbc.update("UPDATE ideas SET title = ?, content = ?, source_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", title, content, sourceUrl, id);
			case TODO -> jdbc.update("UPDATE todos SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", title, content, id);
		};
	}
	public int setCompleted(long id, boolean completed) {
		return jdbc.update("UPDATE todos SET completed = ?, completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?", completed, completed, id);
	}
	public void replaceTags(ContentType type, long id, List<Tag> tags) {
		if (type == ContentType.TODO || type == ContentType.IDEA || type == ContentType.NOTE || type == ContentType.SNIPPET) {
			String join = joinTable(type); String idColumn = idColumn(type);
			jdbc.update("DELETE FROM " + join + " WHERE " + idColumn + " = ?", id);
			for (Tag tag : tags) jdbc.update("INSERT INTO " + join + " (" + idColumn + ", tag_id) VALUES (?, ?)", id, tag.id());
		}
	}
	private ContentEntry map(ContentType type, ResultSet rs) throws SQLException {
		Long projectId = nullableLong(rs, "project_id");
		return new ContentEntry(rs.getLong("id"), type, projectId, rs.getString("title"), rs.getString("content"), rs.getString("language"), rs.getString("source_url"), rs.getBoolean("archived"), rs.getBoolean("completed"), rs.getBoolean("converted"), rs.getBoolean("project_archived"), tags(type, rs.getLong("id")), instant(rs, "filed_at"), instant(rs, "created_at"), instant(rs, "updated_at"));
	}
	private List<Tag> tags(ContentType type, long id) {
		return jdbc.query("SELECT t.id, t.name FROM tags t JOIN " + joinTable(type) + " j ON j.tag_id = t.id WHERE j." + idColumn(type) + " = ? ORDER BY t.name", (rs, row) -> new Tag(rs.getLong("id"), rs.getString("name")), id);
	}
	private static String select(ContentType type) { return switch (type) {
		case NOTE -> "SELECT id, project_id, title, content, '' AS language, source_url, archived, FALSE AS completed, FALSE AS converted, EXISTS (SELECT 1 FROM projects p WHERE p.id = notes.project_id AND p.status = 'ARCHIVED') AS project_archived, filed_at, created_at, updated_at FROM notes";
		case SNIPPET -> "SELECT id, project_id, title, source_code AS content, language, '' AS source_url, archived, FALSE AS completed, FALSE AS converted, EXISTS (SELECT 1 FROM projects p WHERE p.id = code_snippets.project_id AND p.status = 'ARCHIVED') AS project_archived, filed_at, created_at, updated_at FROM code_snippets";
		case IDEA -> "SELECT id, project_id, title, content, '' AS language, source_url, archived, FALSE AS completed, converted, EXISTS (SELECT 1 FROM projects p WHERE p.id = ideas.project_id AND p.status = 'ARCHIVED') AS project_archived, filed_at, created_at, updated_at FROM ideas";
		case TODO -> "SELECT id, project_id, title, content, '' AS language, '' AS source_url, FALSE AS archived, completed, FALSE AS converted, EXISTS (SELECT 1 FROM projects p WHERE p.id = todos.project_id AND p.status = 'ARCHIVED') AS project_archived, filed_at, created_at, updated_at FROM todos";
	}; }
	private static String table(ContentType type) { return switch (type) { case NOTE -> "notes"; case SNIPPET -> "code_snippets"; case IDEA -> "ideas"; case TODO -> "todos"; }; }
	private static String joinTable(ContentType type) { return switch (type) { case NOTE -> "note_tags"; case SNIPPET -> "snippet_tags"; case IDEA -> "idea_tags"; case TODO -> "todo_tags"; }; }
	private static String idColumn(ContentType type) { return switch (type) { case NOTE -> "note_id"; case SNIPPET -> "snippet_id"; case IDEA -> "idea_id"; case TODO -> "todo_id"; }; }
	private static Long nullableLong(ResultSet rs, String column) throws SQLException { long value = rs.getLong(column); return rs.wasNull() ? null : value; }
	private static Instant instant(ResultSet rs, String column) throws SQLException { Timestamp value = rs.getTimestamp(column); return value == null ? null : value.toInstant(); }
}
