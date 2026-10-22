package de.noahteetz.backend.dto;

import de.noahteetz.backend.model.EntityType;

public record EntityReferenceRequest(
		EntityType sourceType,
		Long sourceId,
		EntityType targetType,
		Long targetId
) {
}
