package com.devhub.backend.model;

import java.time.Instant;
import java.util.List;

public record Project(
		Long id,
		String name,
		String description,
		boolean system,
		String repositoryUrl,
		String deploymentUrl,
		List<ProjectLink> links,
		Instant createdAt,
		Instant updatedAt
) {
}
