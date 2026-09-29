package com.devhub.backend.repository;

import com.devhub.backend.model.EntityReference;
import com.devhub.backend.model.EntityType;
import com.devhub.backend.security.CurrentUser;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class EntityReferenceRepository {

	private final JdbcTemplate jdbc;
	private final CurrentUser currentUser;

	public EntityReferenceRepository(JdbcTemplate jdbc, CurrentUser currentUser) {
		this.jdbc = jdbc;
		this.currentUser = currentUser;
	}

	public EntityReference create(EntityType sourceType, long sourceId, EntityType targetType, long targetId) {
		long ownerId = currentUser.id();
		KeyHolder keys = new GeneratedKeyHolder();
		jdbc.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO entity_references (owner_id, source_type, source_id, target_type, target_id) VALUES (?, ?, ?, ?, ?)",
					new String[]{"id"});
			statement.setLong(1, ownerId);
			statement.setString(2, sourceType.name());
			statement.setLong(3, sourceId);
			statement.setString(4, targetType.name());
			statement.setLong(5, targetId);
			return statement;
		}, keys);
		Number key = keys.getKey();
		if (key == null) {
			throw new IllegalStateException("The database did not return a reference id");
		}
		return find(key.longValue()).orElseThrow();
	}

	public Optional<EntityReference> find(long id) {
		return jdbc.query(select() + " WHERE id = ? AND owner_id = ?", EntityReferenceRepository::map, id, currentUser.id())
				.stream().findFirst();
	}

	public Optional<EntityReference> find(EntityType sourceType, long sourceId, EntityType targetType, long targetId) {
		return jdbc.query(select() + " WHERE source_type = ? AND source_id = ? AND target_type = ? AND target_id = ? AND owner_id = ?",
				EntityReferenceRepository::map, sourceType.name(), sourceId, targetType.name(), targetId, currentUser.id())
				.stream().findFirst();
	}

	public List<EntityReference> findOutgoing(EntityType type, long id) {
		return jdbc.query(select() + " WHERE source_type = ? AND source_id = ? AND owner_id = ? ORDER BY created_at, id",
				EntityReferenceRepository::map, type.name(), id, currentUser.id());
	}

	public List<EntityReference> findIncoming(EntityType type, long id) {
		return jdbc.query(select() + " WHERE target_type = ? AND target_id = ? AND owner_id = ? ORDER BY created_at, id",
				EntityReferenceRepository::map, type.name(), id, currentUser.id());
	}

	public int delete(long id) {
		return jdbc.update("DELETE FROM entity_references WHERE id = ? AND owner_id = ?", id, currentUser.id());
	}

	/** Resolves the display title of an entry, or empty when the entry no longer exists or is not the user's. */
	public Optional<String> title(EntityType type, long id) {
		String sql = switch (type) {
			case PROJECT -> "SELECT name FROM projects WHERE id = ? AND owner_id = ?";
			case NOTE -> "SELECT title FROM notes WHERE id = ? AND owner_id = ?";
			case SNIPPET -> "SELECT title FROM code_snippets WHERE id = ? AND owner_id = ?";
			case IDEA -> "SELECT title FROM ideas WHERE id = ? AND owner_id = ?";
			case TODO -> "SELECT title FROM todos WHERE id = ? AND owner_id = ?";
		};
		return jdbc.query(sql, (rs, row) -> rs.getString(1), id, currentUser.id()).stream().findFirst();
	}

	private static String select() {
		return "SELECT id, source_type, source_id, target_type, target_id, created_at FROM entity_references";
	}

	private static EntityReference map(ResultSet rs, int row) throws SQLException {
		EntityType sourceType = EntityType.valueOf(rs.getString("source_type"));
		EntityType targetType = EntityType.valueOf(rs.getString("target_type"));
		long sourceId = rs.getLong("source_id");
		long targetId = rs.getLong("target_id");
		Timestamp createdAt = rs.getTimestamp("created_at");
		return new EntityReference(rs.getLong("id"), sourceType, sourceId, "", targetType, targetId, "",
				targetType.permalink(targetId), sourceType.permalink(sourceId),
				createdAt == null ? Instant.now() : createdAt.toInstant());
	}
}
