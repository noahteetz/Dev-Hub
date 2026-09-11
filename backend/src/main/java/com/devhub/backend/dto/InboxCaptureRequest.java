package com.devhub.backend.dto;

import com.devhub.backend.model.ContentType;
import java.time.Instant;
import java.util.List;

public record InboxCaptureRequest(
		ContentType type,
		String title,
		String content,
		List<String> tags,
		String sourceUrl,
		String language,
		Instant expectedUpdatedAt
) {
	/** Capture never needs a conflict check, so the shorter form omits the expected timestamp. */
	public InboxCaptureRequest(ContentType type, String title, String content, List<String> tags, String sourceUrl, String language) {
		this(type, title, content, tags, sourceUrl, language, null);
	}
}
