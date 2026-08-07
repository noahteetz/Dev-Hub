package com.devhub.backend.model;

import java.time.Instant;

public record CodeSnippet(
		Long id,
		Long projectId,
		String title,
		String language,
		String code,
		Instant createdAt,
		Instant updatedAt
) {
}
