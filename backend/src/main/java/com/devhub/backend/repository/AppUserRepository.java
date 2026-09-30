package com.devhub.backend.repository;

import com.devhub.backend.model.UserSummary;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AppUserRepository {

	private static final String SUMMARY = "SELECT id, username, COALESCE(NULLIF(display_name, ''), username) AS display FROM app_users";

	private final JdbcTemplate jdbcTemplate;

	public AppUserRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/** The internal id behind a login subject; the account is created on its first request. */
	public long resolve(String subject, String username) {
		return resolve(subject, username, null, null);
	}

	public long resolve(String subject, String username, String displayName, String email) {
		String name = username == null ? "" : username;
		String display = displayName == null ? "" : displayName;
		String mail = email == null ? "" : email;
		List<Map<String, Object>> existing = jdbcTemplate.queryForList(
				"SELECT id, username, display_name, email FROM app_users WHERE oidc_subject = ?",
				subject
		);
		if (!existing.isEmpty()) {
			Map<String, Object> row = existing.getFirst();
			long id = ((Number) row.get("id")).longValue();
			if (!name.equals(row.get("username")) || !display.equals(row.get("display_name")) || !mail.equals(row.get("email"))) {
				jdbcTemplate.update("UPDATE app_users SET username = ?, display_name = ?, email = ? WHERE id = ?", name, display, mail, id);
			}
			return id;
		}
		// Two first requests of the same account can race; the loser simply reads the winner's row.
		jdbcTemplate.update(
				"INSERT INTO app_users (oidc_subject, username, display_name, email) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
				subject,
				name,
				display,
				mail
		);
		Long id = jdbcTemplate.queryForObject("SELECT id FROM app_users WHERE oidc_subject = ?", Long.class, subject);
		if (id == null) {
			throw new IllegalStateException("The user could not be read back");
		}
		return id;
	}

	/**
	 * Exactly one account by username, or by e-mail when no username matches. There is
	 * deliberately no partial match, so the lookup cannot be used to list accounts.
	 */
	public Optional<UserSummary> findByUsernameOrEmail(String query) {
		String needle = query.trim().toLowerCase();
		List<UserSummary> byUsername = jdbcTemplate.query(
				SUMMARY + " WHERE LOWER(username) = ? ORDER BY id",
				AppUserRepository::mapUser,
				needle
		);
		if (!byUsername.isEmpty()) {
			return byUsername.size() == 1 ? Optional.of(byUsername.getFirst()) : Optional.empty();
		}
		List<UserSummary> byEmail = jdbcTemplate.query(
				SUMMARY + " WHERE LOWER(email) = ? ORDER BY id",
				AppUserRepository::mapUser,
				needle
		);
		return byEmail.size() == 1 ? Optional.of(byEmail.getFirst()) : Optional.empty();
	}

	public Optional<UserSummary> findById(long id) {
		return jdbcTemplate.query(SUMMARY + " WHERE id = ?", AppUserRepository::mapUser, id).stream().findFirst();
	}

	private static UserSummary mapUser(ResultSet resultSet, int rowNumber) throws SQLException {
		return new UserSummary(resultSet.getLong("id"), resultSet.getString("username"), resultSet.getString("display"));
	}
}
