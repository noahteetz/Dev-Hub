package de.noahteetz.backend.model;

import java.time.Instant;
import java.util.List;

public record Idea(
		Long id,
		Long projectId,
		String title,
		String content,
		boolean converted,
		Long convertedTodoId,
		List<Tag> tags,
		Instant createdAt,
		Instant updatedAt,
		String createdBy
) {
}