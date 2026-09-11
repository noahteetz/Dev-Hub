package com.devhub.backend.model;

import java.time.Instant;

/**
 * The provider quota reported on the last call. All fields are null when the provider
 * sent no quota headers.
 */
public record RepositoryRateLimit(Integer limit, Integer remaining, Instant resetAt) {

	public static final RepositoryRateLimit UNKNOWN = new RepositoryRateLimit(null, null, null);

	public boolean isKnown() {
		return limit != null || remaining != null || resetAt != null;
	}
}
