package com.devhub.backend.dto;

import java.util.List;

public record TodoRequest(
		String title,
		String content,
		List<String> tags
) {
}