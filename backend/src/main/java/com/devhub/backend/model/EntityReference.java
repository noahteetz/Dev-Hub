package com.devhub.backend.model;

import java.time.Instant;

public record EntityReference(
		Long id,
		EntityType sourceType,
		Long sourceId,
		String sourceTitle,
		EntityType targetType,
		Long targetId,
		String targetTitle,
		String targetUrl,
		String sourceUrl,
		Instant createdAt
) {
}
