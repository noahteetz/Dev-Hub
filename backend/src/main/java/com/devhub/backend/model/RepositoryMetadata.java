package com.devhub.backend.model;

import java.time.Instant;
import java.util.Map;

public record RepositoryMetadata(
		Long projectId,
		RepositoryProvider provider,
		String owner,
		String repositoryName,
		String canonicalUrl,
		String defaultBranch,
		String lastCommitSha,
		String lastCommitMessage,
		String lastCommitAuthor,
		Instant lastCommitAt,
		String readmeFileName,
		String readmeContent,
		Map<String, Double> languages,
		RepositorySyncStatus syncStatus,
		Instant lastAttemptAt,
		Instant lastSuccessfulSyncAt,
		String errorCode,
		String errorMessage,
		String branchesUrl,
		String issuesUrl,
		String pullRequestsUrl,
		/** Sent back to the provider so an unchanged repository costs no quota. */
		String etag,
		RepositoryRateLimit rateLimit
) {
	}
