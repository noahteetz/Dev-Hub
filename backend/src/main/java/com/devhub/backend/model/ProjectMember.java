package com.devhub.backend.model;

import java.time.Instant;

public record ProjectMember(
		Long userId,
		String username,
		String displayName,
		ProjectRole role,
		Instant addedAt
) {
}
