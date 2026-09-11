package com.devhub.backend.repository;

import com.devhub.backend.model.RepositoryMetadata;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryRateLimit;
import com.devhub.backend.model.RepositoryReference;
import com.devhub.backend.model.RepositorySnapshot;
import com.devhub.backend.model.RepositorySyncStatus;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RepositoryMetadataRepository {

	private static final String SELECT_COLUMNS = """
			SELECT project_id, provider, owner_name, repository_name, canonical_url, default_branch,
					last_commit_sha, last_commit_message, last_commit_author, last_commit_at,
					readme_file_name, readme_content, languages_json, sync_status, last_attempt_at,
					last_successful_sync_at, error_code, error_message, branches_url, issues_url,
					pull_requests_url, etag, rate_limit_limit, rate_limit_remaining, rate_limit_reset_at
				FROM repository_metadata
			""";

	private final JdbcTemplate jdbcTemplate;
	private final ObjectMapper objectMapper;

	public RepositoryMetadataRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
		this.jdbcTemplate = jdbcTemplate;
		this.objectMapper = objectMapper;
	}

	public Optional<RepositoryMetadata> findByProjectId(long projectId) {
		return jdbcTemplate.query(
				SELECT_COLUMNS + " WHERE project_id = ?",
				this::mapRow,
				projectId
		).stream().findFirst();
	}

	public void markSyncing(long projectId, RepositoryReference reference) {
		Instant now = Instant.now();
		int updated = jdbcTemplate.update(
				"UPDATE repository_metadata SET provider = ?, owner_name = ?, repository_name = ?, canonical_url = ?, sync_status = ?, last_attempt_at = ?, error_code = '', error_message = '' WHERE project_id = ?",
				reference.provider().name(),
				reference.owner(),
				reference.repositoryName(),
				reference.canonicalUrl(),
				RepositorySyncStatus.SYNCING.name(),
				timestamp(now),
				projectId
		);
		if (updated == 0) {
			jdbcTemplate.update(
					"INSERT INTO repository_metadata (project_id, provider, owner_name, repository_name, canonical_url, sync_status, last_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
					projectId,
					reference.provider().name(),
					reference.owner(),
					reference.repositoryName(),
					reference.canonicalUrl(),
					RepositorySyncStatus.SYNCING.name(),
					timestamp(now)
			);
		}
	}

	public void deleteByProjectId(long projectId) {
		jdbcTemplate.update("DELETE FROM repository_metadata WHERE project_id = ?", projectId);
	}

	public void saveSuccess(
			long projectId,
			RepositoryReference reference,
			RepositorySnapshot snapshot,
			String etag,
			RepositoryRateLimit rateLimit
	) {
		Instant now = Instant.now();
		String languages = writeLanguages(snapshot.languages());
		RepositoryRateLimit quota = rateLimit == null ? RepositoryRateLimit.UNKNOWN : rateLimit;
		int updated = jdbcTemplate.update(
				"UPDATE repository_metadata SET provider = ?, owner_name = ?, repository_name = ?, canonical_url = ?, default_branch = ?, last_commit_sha = ?, last_commit_message = ?, last_commit_author = ?, last_commit_at = ?, readme_file_name = ?, readme_content = ?, languages_json = ?, sync_status = ?, last_attempt_at = ?, last_successful_sync_at = ?, error_code = '', error_message = '', branches_url = ?, issues_url = ?, pull_requests_url = ?, etag = ?, rate_limit_limit = ?, rate_limit_remaining = ?, rate_limit_reset_at = ? WHERE project_id = ?",
				reference.provider().name(),
				reference.owner(),
				reference.repositoryName(),
				reference.canonicalUrl(),
				snapshot.defaultBranch(),
				snapshot.lastCommitSha(),
				snapshot.lastCommitMessage(),
				snapshot.lastCommitAuthor(),
				timestamp(snapshot.lastCommitAt()),
				snapshot.readmeFileName(),
				snapshot.readmeContent(),
				languages,
				RepositorySyncStatus.READY.name(),
				timestamp(now),
				timestamp(now),
				snapshot.branchesUrl(),
				snapshot.issuesUrl(),
				snapshot.pullRequestsUrl(),
				etag == null ? "" : etag,
				quota.limit(),
				quota.remaining(),
				timestamp(quota.resetAt()),
				projectId
		);
		if (updated == 0) {
			jdbcTemplate.update(
					"INSERT INTO repository_metadata (project_id, provider, owner_name, repository_name, canonical_url, default_branch, last_commit_sha, last_commit_message, last_commit_author, last_commit_at, readme_file_name, readme_content, languages_json, sync_status, last_attempt_at, last_successful_sync_at, branches_url, issues_url, pull_requests_url, etag, rate_limit_limit, rate_limit_remaining, rate_limit_reset_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
					projectId,
					reference.provider().name(),
					reference.owner(),
					reference.repositoryName(),
					reference.canonicalUrl(),
					snapshot.defaultBranch(),
					snapshot.lastCommitSha(),
					snapshot.lastCommitMessage(),
					snapshot.lastCommitAuthor(),
					timestamp(snapshot.lastCommitAt()),
					snapshot.readmeFileName(),
					snapshot.readmeContent(),
					languages,
					RepositorySyncStatus.READY.name(),
					timestamp(now),
					timestamp(now),
					snapshot.branchesUrl(),
					snapshot.issuesUrl(),
					snapshot.pullRequestsUrl(),
					etag == null ? "" : etag,
					quota.limit(),
					quota.remaining(),
					timestamp(quota.resetAt())
			);
		}
	}

	/**
	 * The provider answered 304, so the cached metadata is still current. Only the sync
	 * bookkeeping moves forward.
	 */
	public void markUnchanged(long projectId, String etag, RepositoryRateLimit rateLimit) {
		Instant now = Instant.now();
		RepositoryRateLimit quota = rateLimit == null ? RepositoryRateLimit.UNKNOWN : rateLimit;
		jdbcTemplate.update(
				"UPDATE repository_metadata SET sync_status = ?, last_attempt_at = ?, last_successful_sync_at = ?, error_code = '', error_message = '', etag = ?, rate_limit_limit = ?, rate_limit_remaining = ?, rate_limit_reset_at = ? WHERE project_id = ?",
				RepositorySyncStatus.READY.name(),
				timestamp(now),
				timestamp(now),
				etag == null ? "" : etag,
				quota.limit(),
				quota.remaining(),
				timestamp(quota.resetAt()),
				projectId
		);
	}

	public void saveFailure(
			long projectId,
			RepositoryReference reference,
			RepositorySyncStatus status,
			String errorCode,
			String errorMessage,
			RepositoryRateLimit rateLimit
	) {
		Instant now = Instant.now();
		RepositoryRateLimit quota = rateLimit == null ? RepositoryRateLimit.UNKNOWN : rateLimit;
		int updated = jdbcTemplate.update(
				"UPDATE repository_metadata SET provider = ?, owner_name = ?, repository_name = ?, canonical_url = ?, sync_status = ?, last_attempt_at = ?, error_code = ?, error_message = ?, rate_limit_limit = ?, rate_limit_remaining = ?, rate_limit_reset_at = ? WHERE project_id = ?",
				reference.provider().name(),
				reference.owner(),
				reference.repositoryName(),
				reference.canonicalUrl(),
				status.name(),
				timestamp(now),
				errorCode,
				errorMessage,
				quota.limit(),
				quota.remaining(),
				timestamp(quota.resetAt()),
				projectId
		);
		if (updated == 0) {
			jdbcTemplate.update(
					"INSERT INTO repository_metadata (project_id, provider, owner_name, repository_name, canonical_url, sync_status, last_attempt_at, error_code, error_message, rate_limit_limit, rate_limit_remaining, rate_limit_reset_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
					projectId,
					reference.provider().name(),
					reference.owner(),
					reference.repositoryName(),
					reference.canonicalUrl(),
					status.name(),
					timestamp(now),
					errorCode,
					errorMessage,
					quota.limit(),
					quota.remaining(),
					timestamp(quota.resetAt())
			);
		}
	}

	private RepositoryMetadata mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
		return new RepositoryMetadata(
				resultSet.getLong("project_id"),
				RepositoryProvider.valueOf(resultSet.getString("provider")),
				resultSet.getString("owner_name"),
				resultSet.getString("repository_name"),
				resultSet.getString("canonical_url"),
				resultSet.getString("default_branch"),
				resultSet.getString("last_commit_sha"),
				resultSet.getString("last_commit_message"),
				resultSet.getString("last_commit_author"),
				toInstant(resultSet.getTimestamp("last_commit_at")),
				resultSet.getString("readme_file_name"),
				resultSet.getString("readme_content"),
				readLanguages(resultSet.getString("languages_json")),
				RepositorySyncStatus.valueOf(resultSet.getString("sync_status")),
				toInstant(resultSet.getTimestamp("last_attempt_at")),
				toInstant(resultSet.getTimestamp("last_successful_sync_at")),
				resultSet.getString("error_code"),
				resultSet.getString("error_message"),
				resultSet.getString("branches_url"),
				resultSet.getString("issues_url"),
				resultSet.getString("pull_requests_url"),
				resultSet.getString("etag"),
				new RepositoryRateLimit(
						nullableInt(resultSet, "rate_limit_limit"),
						nullableInt(resultSet, "rate_limit_remaining"),
						toInstant(resultSet.getTimestamp("rate_limit_reset_at"))
				)
		);
	}

	private String writeLanguages(Map<String, Double> languages) {
		try {
			return objectMapper.writeValueAsString(languages == null ? Map.of() : languages);
		} catch (JacksonException exception) {
			throw new IllegalStateException("Repository languages could not be stored", exception);
		}
	}

	private Map<String, Double> readLanguages(String value) {
		if (value == null || value.isBlank()) {
			return Map.of();
		}
		try {
			return objectMapper.readValue(value, new TypeReference<>() {
			});
		} catch (JacksonException exception) {
			return Collections.emptyMap();
		}
	}

	private static Integer nullableInt(ResultSet resultSet, String column) throws SQLException {
		int value = resultSet.getInt(column);
		return resultSet.wasNull() ? null : value;
	}

	private static Timestamp timestamp(Instant value) {
		return value == null ? null : Timestamp.from(value);
	}

	private static Instant toInstant(Timestamp value) {
		return value == null ? null : value.toInstant();
	}
}
