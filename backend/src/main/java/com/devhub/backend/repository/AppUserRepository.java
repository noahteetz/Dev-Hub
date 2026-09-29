package com.devhub.backend.repository;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AppUserRepository {

	private final JdbcTemplate jdbcTemplate;

	public AppUserRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/** The internal id behind a login subject; the account is created on its first request. */
	public long resolve(String subject, String username) {
		String name = username == null ? "" : username;
		List<Map<String, Object>> existing = jdbcTemplate.queryForList(
				"SELECT id, username FROM app_users WHERE oidc_subject = ?",
				subject
		);
		if (!existing.isEmpty()) {
			long id = ((Number) existing.getFirst().get("id")).longValue();
			if (!name.equals(existing.getFirst().get("username"))) {
				jdbcTemplate.update("UPDATE app_users SET username = ? WHERE id = ?", name, id);
			}
			return id;
		}
		// Two first requests of the same account can race; the loser simply reads the winner's row.
		jdbcTemplate.update(
				"INSERT INTO app_users (oidc_subject, username) VALUES (?, ?) ON CONFLICT DO NOTHING",
				subject,
				name
		);
		Long id = jdbcTemplate.queryForObject("SELECT id FROM app_users WHERE oidc_subject = ?", Long.class, subject);
		if (id == null) {
			throw new IllegalStateException("The user could not be read back");
		}
		return id;
	}
}
