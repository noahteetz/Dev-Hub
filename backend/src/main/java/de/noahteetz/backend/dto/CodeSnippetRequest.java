package de.noahteetz.backend.dto;

public record CodeSnippetRequest(
		String title,
		String language,
		String code
) {
}
