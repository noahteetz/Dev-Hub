package com.devhub.backend.dto;

import com.devhub.backend.model.EntityType;

public record EntityReferenceRequest(
		EntityType sourceType,
		Long sourceId,
		EntityType targetType,
		Long targetId
) {
}
