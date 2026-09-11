package com.devhub.backend.model;

import java.time.Instant;
import java.util.List;

public record SearchResult(
		EntityType type,
		Long id,
		String title,
		Long projectId,
		String projectName,
		String excerpt,
		List<Tag> tags,
		boolean titleMatch,
		boolean archived,
		boolean completed,
		String url,
		Instant createdAt,
		Instant updatedAt
) {
}
