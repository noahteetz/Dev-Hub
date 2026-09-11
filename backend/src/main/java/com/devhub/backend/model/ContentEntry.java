package com.devhub.backend.model;

import java.time.Instant;
import java.util.List;

public record ContentEntry(
		Long id,
		ContentType type,
		Long projectId,
		String title,
		String content,
		String language,
		String sourceUrl,
		boolean archived,
		boolean completed,
		boolean converted,
		boolean projectArchived,
		List<Tag> tags,
		Instant filedAt,
		Instant createdAt,
		Instant updatedAt
) {
}
