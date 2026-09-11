package com.devhub.backend.model;

import java.time.Instant;
import java.util.List;

/**
 * The stored credential including the encrypted token. This record never leaves the
 * service layer; the API answers with {@link GitCredentialView} instead.
 */
public record GitCredential(
		RepositoryProvider provider,
		String label,
		String host,
		String tokenEncrypted,
		String tokenHint,
		String accountLogin,
		List<String> scopes,
		GitCredentialStatus status,
		String lastError,
		Instant createdAt,
		Instant lastVerifiedAt
) {
	public GitCredentialView toView() {
		return new GitCredentialView(
				provider,
				label,
				host,
				tokenHint,
				accountLogin,
				scopes,
				status,
				lastError,
				createdAt,
				lastVerifiedAt
		);
	}
}
