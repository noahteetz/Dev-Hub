package com.devhub.backend.model;

import java.time.Instant;
import java.util.List;

/**
 * What the API is allowed to show about a stored token. The token itself is never part
 * of this record; {@code tokenHint} carries only its last few characters.
 */
public record GitCredentialView(
		RepositoryProvider provider,
		String label,
		String host,
		String tokenHint,
		String accountLogin,
		List<String> scopes,
		GitCredentialStatus status,
		String lastError,
		Instant createdAt,
		Instant lastVerifiedAt
) {
}
