package de.noahteetz.backend.dto;

import de.noahteetz.backend.model.ProjectStatus;

public record ProjectOrganizationRequest(
		ProjectStatus status,
		Integer priority
) {
}