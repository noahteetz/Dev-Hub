package com.devhub.backend.model;

import java.time.Instant;

/**
 * A project the background sync may refresh. It carries just enough to decide
 * whether the provider should be called at all, so the scheduler does not load a
 * full project for every candidate.
 */
public record RepositorySyncCandidate(
		long projectId,
		String repositoryUrl,
		RepositorySyncStatus syncStatus,
		Instant rateLimitResetAt
) {
}
