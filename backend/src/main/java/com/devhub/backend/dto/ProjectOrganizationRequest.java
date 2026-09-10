package com.devhub.backend.dto;

import com.devhub.backend.model.ProjectStatus;

public record ProjectOrganizationRequest(
		ProjectStatus status,
		Integer priority,
		Boolean favorite
) {
}