package com.devhub.backend.model;

import java.time.Instant;

public record Project(
		Long id,
		String name,
		String description,
		boolean system,
		Instant createdAt,
		Instant updatedAt
) {
}
