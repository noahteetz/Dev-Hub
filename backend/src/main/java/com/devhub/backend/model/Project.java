package com.devhub.backend.model;

import java.time.Instant;

public record Project(
		Long id,
		String name,
		String description,
		Instant createdAt,
		Instant updatedAt
) {
}
