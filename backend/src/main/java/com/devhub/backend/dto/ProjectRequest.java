package com.devhub.backend.dto;

import java.util.List;

public record ProjectRequest(
		String name,
		String description,
		String repositoryUrl,
		String deploymentUrl,
		List<ProjectLinkRequest> links
) {
}
