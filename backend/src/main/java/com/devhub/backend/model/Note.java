package com.devhub.backend.model;

import java.time.Instant;

public record Note(
		Long id,
		Long projectId,
		String title,
		String content,
		Instant createdAt,
		Instant updatedAt
) {
}
