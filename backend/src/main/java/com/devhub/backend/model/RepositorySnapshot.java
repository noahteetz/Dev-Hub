package com.devhub.backend.model;

import java.time.Instant;
import java.util.Map;

public record RepositorySnapshot(
		String defaultBranch,
		String lastCommitSha,
		String lastCommitMessage,
		String lastCommitAuthor,
		Instant lastCommitAt,
		String readmeFileName,
		String readmeContent,
		Map<String, Double> languages,
		String branchesUrl,
		String issuesUrl,
		String pullRequestsUrl
) {
}