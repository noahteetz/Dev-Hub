package com.devhub.backend.model;

import java.util.List;
import java.util.Set;

public record SearchCriteria(
		String term,
		Set<EntityType> types,
		Long projectId,
		List<String> tags,
		boolean includeArchived,
		boolean includeCompleted,
		int limit,
		int offset
) {
}
