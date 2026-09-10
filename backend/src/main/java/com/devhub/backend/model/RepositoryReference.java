package com.devhub.backend.model;

public record RepositoryReference(
		RepositoryProvider provider,
		String owner,
		String repositoryName,
		String canonicalUrl
) {
}