package com.devhub.backend.model;

public record ProjectLink(
		Long id,
		Long projectId,
		String label,
		String url,
		int order
) {
}