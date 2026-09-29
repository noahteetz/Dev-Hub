package com.devhub.backend.repository;

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
public class TagRepository {

	private final JdbcTemplate jdbcTemplate;
	private final CurrentUser currentUser;

	public TagRepository(JdbcTemplate jdbcTemplate, CurrentUser currentUser) {
		this.jdbcTemplate = jdbcTemplate;
		this.currentUser = currentUser;
	}

	public List<Tag> findAll() {
		return jdbcTemplate.query(
				"SELECT id, name FROM tags WHERE owner_id = ? ORDER BY name",
				TagRepository::mapRow,
				currentUser.id()
		);
	}

	public Optional<Tag> findByName(String name) {
		return jdbcTemplate.query(
				"SELECT id, name FROM tags WHERE name = ? AND owner_id = ?",
				TagRepository::mapRow,
				name,
				currentUser.id()
		).stream().findFirst();
	}

	public Tag create(String name) {
		long ownerId = currentUser.id();
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
		return findById(key.longValue())
				.orElseThrow(() -> new IllegalStateException("The new tag could not be read"));
	}

	public Optional<Tag> findById(long id) {
		return jdbcTemplate.query(
				"SELECT id, name FROM tags WHERE id = ? AND owner_id = ?",
				TagRepository::mapRow,
				id,
				currentUser.id()
		).stream().findFirst();
	}

	public void deleteOrphans() {
		jdbcTemplate.update("""
				DELETE FROM tags
				WHERE owner_id = ?
					AND NOT EXISTS (SELECT 1 FROM idea_tags WHERE idea_tags.tag_id = tags.id)
					AND NOT EXISTS (SELECT 1 FROM todo_tags WHERE todo_tags.tag_id = tags.id)
					AND NOT EXISTS (SELECT 1 FROM note_tags WHERE note_tags.tag_id = tags.id)
					AND NOT EXISTS (SELECT 1 FROM snippet_tags WHERE snippet_tags.tag_id = tags.id)
				""", currentUser.id());
	}

	private static Tag mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		return new Tag(resultSet.getLong("id"), resultSet.getString("name"));
	}
}