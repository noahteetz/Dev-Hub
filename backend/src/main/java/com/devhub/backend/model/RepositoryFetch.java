package com.devhub.backend.model;

/**
 * One provider read. When {@code notModified} is true the provider answered 304 and
 * {@code snapshot} is null, so the cached metadata stays untouched.
 */
public record RepositoryFetch(
		boolean notModified,
		String etag,
		RepositorySnapshot snapshot,
		RepositoryRateLimit rateLimit
) {
	public static RepositoryFetch notModified(String etag, RepositoryRateLimit rateLimit) {
		return new RepositoryFetch(true, etag == null ? "" : etag, null, rateLimit);
	}

	public static RepositoryFetch of(String etag, RepositorySnapshot snapshot, RepositoryRateLimit rateLimit) {
		return new RepositoryFetch(false, etag == null ? "" : etag, snapshot, rateLimit);
	}
}
