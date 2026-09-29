package com.devhub.backend.repository;

import com.devhub.backend.model.Tag;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/** Tags live in the namespace of one account: the owner of the entries they are put on. */
@Repository
public class TagRepository {

	private final JdbcTemplate jdbcTemplate;

	public TagRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public List<Tag> findAll(long ownerId) {
		return jdbcTemplate.query(
				"SELECT id, name FROM tags WHERE owner_id = ? ORDER BY name",
				TagRepository::mapRow,
				ownerId
		);
	}

	public Optional<Tag> findByName(long ownerId, String name) {
		return jdbcTemplate.query(
				"SELECT id, name FROM tags WHERE name = ? AND owner_id = ?",
				TagRepository::mapRow,
				name,
				ownerId
		).stream().findFirst();
	}

	public Tag create(long ownerId, String name) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement(
					"INSERT INTO tags (owner_id, name) VALUES (?, ?)",
					new String[]{"id"}
			);
			statement.setLong(1, ownerId);
			statement.setString(2, name);
			return statement;
		}, keyHolder);

		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("The database did not return the new tag id");
		}
		return findById(ownerId, key.longValue())
				.orElseThrow(() -> new IllegalStateException("The new tag could not be read"));
	}

	public Optional<Tag> findById(long ownerId, long id) {
		return jdbcTemplate.query(
				"SELECT id, name FROM tags WHERE id = ? AND owner_id = ?",
				TagRepository::mapRow,
				id,
				ownerId
		).stream().findFirst();
	}

	public void deleteOrphans(long ownerId) {
		jdbcTemplate.update("""
				DELETE FROM tags
				WHERE owner_id = ?
					AND NOT EXISTS (SELECT 1 FROM idea_tags WHERE idea_tags.tag_id = tags.id)
					AND NOT EXISTS (SELECT 1 FROM todo_tags WHERE todo_tags.tag_id = tags.id)
					AND NOT EXISTS (SELECT 1 FROM note_tags WHERE note_tags.tag_id = tags.id)
					AND NOT EXISTS (SELECT 1 FROM snippet_tags WHERE snippet_tags.tag_id = tags.id)
				""", ownerId);
	}

	private static Tag mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		return new Tag(resultSet.getLong("id"), resultSet.getString("name"));
	}
}