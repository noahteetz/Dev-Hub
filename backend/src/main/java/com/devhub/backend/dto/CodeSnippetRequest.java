package com.devhub.backend.dto;

public record CodeSnippetRequest(
		String title,
		String language,
		String code
) {
}
