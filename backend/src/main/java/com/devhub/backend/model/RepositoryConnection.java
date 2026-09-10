package com.devhub.backend.model;

public record RepositoryConnection(
		Long projectId,
		String inputUrl,
		RepositoryProvider provider,
		String owner,
		String repositoryName,
		String canonicalUrl,
		RepositoryMetadata metadata
) {
}