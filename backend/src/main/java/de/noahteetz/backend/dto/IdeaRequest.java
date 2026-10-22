package de.noahteetz.backend.dto;

import java.util.List;

public record IdeaRequest(
		String title,
		String content,
		List<String> tags
) {
}