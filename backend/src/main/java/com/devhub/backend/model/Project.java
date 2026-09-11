package com.devhub.backend.model;

import java.time.Instant;
import java.util.List;

public record Project(
		Long id,
		String name,
		String description,
		ProjectStatus status,
		int priority,
		boolean favorite,
		ProjectStatus statusBeforeArchive,
		String repositoryUrl,
		String deploymentUrl,
		String progressSummary,
		String nextStep,
		String blockers,
		String startCommand,
		String buildCommand,
		String technicalDecisions,
		Instant contextUpdatedAt,
		Instant archivedAt,
		String archiveReason,
		List<ProjectLink> links,
		Instant createdAt,
		Instant updatedAt,
		Instant effectiveActivityAt,
		boolean stale
) {
}
