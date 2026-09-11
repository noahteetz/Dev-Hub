package com.devhub.backend.repository;

import com.devhub.backend.model.GitCredential;
import com.devhub.backend.model.GitCredentialStatus;
import com.devhub.backend.model.RepositoryProvider;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GitCredentialRepository {

	private static final String SELECT_COLUMNS = """
			SELECT provider, label, host, token_encrypted, token_hint, account_login, scopes,
					status, last_error, created_at, last_verified_at
				FROM git_credentials
			""";

	private final JdbcTemplate jdbcTemplate;

	public GitCredentialRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public List<GitCredential> findAll() {
		return jdbcTemplate.query(SELECT_COLUMNS + " ORDER BY provider", this::mapRow);
	}

	public Optional<GitCredential> findByProvider(RepositoryProvider provider) {
		return jdbcTemplate.query(SELECT_COLUMNS + " WHERE provider = ?", this::mapRow, provider.name())
				.stream()
				.findFirst();
	}

	/** Replaces the token and resets everything the provider has to confirm again. */
	public void save(
			RepositoryProvider provider,
			String label,
			String host,
			String tokenEncrypted,
			String tokenHint,
			String accountLogin,
			List<String> scopes,
			GitCredentialStatus status
	) {
		String joinedScopes = String.join(",", scopes == null ? List.of() : scopes);
		Instant now = Instant.now();
		int updated = jdbcTemplate.update(
				"""
				UPDATE git_credentials
					SET label = ?, host = ?, token_encrypted = ?, token_hint = ?, account_login = ?,
						scopes = ?, status = ?, last_error = '', last_verified_at = ?
					WHERE provider = ?
				""",
				label,
				host,
				tokenEncrypted,
				tokenHint,
				accountLogin,
				joinedScopes,
				status.name(),
				timestamp(status == GitCredentialStatus.VERIFIED ? now : null),
				provider.name()
		);
		if (updated == 0) {
			jdbcTemplate.update(
					"""
					INSERT INTO git_credentials
						(provider, label, host, token_encrypted, token_hint, account_login, scopes,
							status, created_at, last_verified_at)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					""",
					provider.name(),
					label,
					host,
					tokenEncrypted,
					tokenHint,
					accountLogin,
					joinedScopes,
					status.name(),
					timestamp(now),
					timestamp(status == GitCredentialStatus.VERIFIED ? now : null)
			);
		}
	}

	/** Records the outcome of a verification without touching the stored token. */
	public void updateVerification(
			RepositoryProvider provider,
			String accountLogin,
			List<String> scopes,
			GitCredentialStatus status,
			String lastError
	) {
		jdbcTemplate.update(
				"""
				UPDATE git_credentials
					SET account_login = ?, scopes = ?, status = ?, last_error = ?, last_verified_at = ?
					WHERE provider = ?
				""",
				accountLogin,
				String.join(",", scopes == null ? List.of() : scopes),
				status.name(),
				lastError,
				timestamp(status == GitCredentialStatus.VERIFIED ? Instant.now() : null),
				provider.name()
		);
	}

	public int deleteByProvider(RepositoryProvider provider) {
		return jdbcTemplate.update("DELETE FROM git_credentials WHERE provider = ?", provider.name());
	}

	private GitCredential mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		return new GitCredential(
				RepositoryProvider.valueOf(resultSet.getString("provider")),
				resultSet.getString("label"),
				resultSet.getString("host"),
				resultSet.getString("token_encrypted"),
				resultSet.getString("token_hint"),
				resultSet.getString("account_login"),
				splitScopes(resultSet.getString("scopes")),
				GitCredentialStatus.valueOf(resultSet.getString("status")),
				resultSet.getString("last_error"),
				toInstant(resultSet.getTimestamp("created_at")),
				toInstant(resultSet.getTimestamp("last_verified_at"))
		);
	}

	private static List<String> splitScopes(String value) {
		if (value == null || value.isBlank()) {
			return List.of();
		}
		return Arrays.stream(value.split(","))
				.map(String::trim)
				.filter(scope -> !scope.isBlank())
				.toList();
	}

	private static Timestamp timestamp(Instant value) {
		return value == null ? null : Timestamp.from(value);
	}

	private static Instant toInstant(Timestamp value) {
		return value == null ? null : value.toInstant();
	}
}
