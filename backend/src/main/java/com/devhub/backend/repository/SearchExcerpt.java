package com.devhub.backend.repository;

final class SearchExcerpt {

	private static final int WINDOW = 160;

	private SearchExcerpt() {
	}

	/** Returns a short window of {@code content} around the first occurrence of {@code term}. */
	static String around(String content, String term) {
		String text = content == null ? "" : content.replaceAll("\\s+", " ").trim();
		if (text.isEmpty()) {
			return "";
		}

		int match = text.toLowerCase().indexOf(term.toLowerCase());
		if (match < 0) {
			return text.length() <= WINDOW ? text : text.substring(0, WINDOW).trim() + "…";
		}

		int start = Math.max(0, match - WINDOW / 3);
		int end = Math.min(text.length(), start + WINDOW);
		String excerpt = text.substring(start, end).trim();
		return (start > 0 ? "…" : "") + excerpt + (end < text.length() ? "…" : "");
	}
}
