package com.devhub.backend.dto;

import java.util.List;

public record ProjectRequest(
		String name,
		String description,
		String repositoryUrl,
		String deploymentUrl,
		List<ProjectLinkRequest> links,
		List<String> additionalRepositoryUrls
) {
	public ProjectRequest(String name, String description, String repositoryUrl, String deploymentUrl,
			List<ProjectLinkRequest> links) {
		this(name, description, repositoryUrl, deploymentUrl, links, null);
	}
}
