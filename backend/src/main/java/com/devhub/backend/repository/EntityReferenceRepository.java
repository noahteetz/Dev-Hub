package com.devhub.backend.repository;

import com.devhub.backend.model.EntityReference;
import com.devhub.backend.model.EntityType;
import com.devhub.backend.repository.GlobalContentRepository.Placement;
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

	/** Who created the reference. It stays visible to everybody who can see both of its ends. */
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
		return jdbc.query(select() + " WHERE id = ?", EntityReferenceRepository::map, id)
				.stream().findFirst();
	}

	public Optional<EntityReference> find(EntityType sourceType, long sourceId, EntityType targetType, long targetId) {
		return jdbc.query(select() + " WHERE source_type = ? AND source_id = ? AND target_type = ? AND target_id = ?",
				EntityReferenceRepository::map, sourceType.name(), sourceId, targetType.name(), targetId)
				.stream().findFirst();
	}

	public List<EntityReference> findOutgoing(EntityType type, long id) {
		return jdbc.query(select() + " WHERE source_type = ? AND source_id = ? ORDER BY created_at, id",
				EntityReferenceRepository::map, type.name(), id);
	}

	public List<EntityReference> findIncoming(EntityType type, long id) {
		return jdbc.query(select() + " WHERE target_type = ? AND target_id = ? ORDER BY created_at, id",
				EntityReferenceRepository::map, type.name(), id);
	}

	public int delete(long id) {
		return jdbc.update("DELETE FROM entity_references WHERE id = ?", id);
	}

	public boolean createdByCurrentUser(long id) {
		Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM entity_references WHERE id = ? AND owner_id = ?", Integer.class, id, currentUser.id());
		return count != null && count > 0;
	}

	/** Resolves the display title of an entry, or empty when it does not exist or the user may not see it. */
	public Optional<String> title(EntityType type, long id) {
		long me = currentUser.id();
		String member = "(p.owner_id = ? OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = p.id AND m.user_id = ?))";
		if (type == EntityType.PROJECT) {
			return jdbc.query("SELECT p.name FROM projects p WHERE p.id = ? AND " + member, (rs, row) -> rs.getString(1), id, me, me).stream().findFirst();
		}
		String sql = "SELECT t.title FROM " + table(type) + " t WHERE t.id = ? AND ((t.project_id IS NULL AND t.owner_id = ?) OR EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND " + member + "))";
		return jdbc.query(sql, (rs, row) -> rs.getString(1), id, me, me, me).stream().findFirst();
	}

	public boolean exists(EntityType type, long id) {
		Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + table(type) + " WHERE id = ?", Integer.class, id);
		return count != null && count > 0;
	}

	/** Whose data the entry is and which project it sits in; a project sits in itself. */
	public Optional<Placement> placement(EntityType type, long id) {
		String sql = type == EntityType.PROJECT
				? "SELECT owner_id, id AS project_id FROM projects WHERE id = ?"
				: "SELECT owner_id, project_id FROM " + table(type) + " WHERE id = ?";
		return jdbc.query(sql, (rs, row) -> {
			long ownerId = rs.getLong("owner_id");
			long projectId = rs.getLong("project_id");
			return new Placement(ownerId, rs.wasNull() ? null : projectId);
		}, id).stream().findFirst();
	}

	private static String table(EntityType type) {
		return switch (type) {
			case PROJECT -> "projects";
			case NOTE -> "notes";
			case SNIPPET -> "code_snippets";
			case IDEA -> "ideas";
			case TODO -> "todos";
		};
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
