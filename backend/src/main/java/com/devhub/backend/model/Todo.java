package com.devhub.backend.model;

import java.time.Instant;
import java.util.List;

public record Todo(
		Long id,
		Long projectId,
		String title,
		String content,
		boolean completed,
		Instant completedAt,
		List<Tag> tags,
		Instant createdAt,
		Instant updatedAt
) {
}