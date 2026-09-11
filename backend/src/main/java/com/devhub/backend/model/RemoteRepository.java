package com.devhub.backend.model;

import java.time.Instant;

/** One selectable repository from a provider account, used by the repository picker. */
public record RemoteRepository(
		RepositoryProvider provider,
		String owner,
		String name,
		String fullName,
		String description,
		boolean privateRepository,
		boolean archived,
		String defaultBranch,
		Instant lastActivityAt,
		String primaryLanguage,
		String webUrl
) {
}
