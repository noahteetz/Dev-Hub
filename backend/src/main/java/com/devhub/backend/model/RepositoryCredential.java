package com.devhub.backend.model;

/**
 * A decrypted token handed to a provider for a single call chain. Kept separate from
 * {@link GitCredential} so nothing that carries the plain token is ever serialized.
 */
public record RepositoryCredential(RepositoryProvider provider, String token) {

	public boolean hasToken() {
		return token != null && !token.isBlank();
	}

	/** Keeps the token out of logs and stack traces. */
	@Override
	public String toString() {
		return "RepositoryCredential[provider=" + provider + ", token=***]";
	}
}
