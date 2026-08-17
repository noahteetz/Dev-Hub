package com.devhub.backend.service;

import com.devhub.backend.exception.InvalidRequestException;
import java.net.URI;
import java.net.URISyntaxException;

final class RequestValidation {

	private RequestValidation() {
	}

	static <T> T requireRequest(T request) {
		if (request == null) {
			throw new InvalidRequestException("Request body is required");
		}
		return request;
	}

	static long requireId(long id, String resourceName) {
		if (id <= 0) {
			throw new InvalidRequestException(resourceName + " id must be greater than zero");
		}
		return id;
	}

	static String required(String value, String fieldName) {
		if (value == null || value.isBlank()) {
			throw new InvalidRequestException(fieldName + " is required");
		}
		return value.trim();
	}

	static String requiredContent(String value, String fieldName) {
		if (value == null || value.isBlank()) {
			throw new InvalidRequestException(fieldName + " is required");
		}
		return value;
	}

	static String optional(String value) {
		return value == null ? "" : value.trim();
	}

	static String optionalLanguage(String value) {
		return value == null || value.isBlank() ? "text" : value.trim();
	}

	static String optionalUrl(String value, String fieldName) {
		return value == null || value.isBlank() ? "" : requiredUrl(value, fieldName);
	}

	static String requiredUrl(String value, String fieldName) {
		String url = required(value, fieldName);
		try {
			URI uri = new URI(url);
			if (!uri.isAbsolute() || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
				throw new InvalidRequestException(fieldName + " must be an http or https URL");
			}
			return url;
		} catch (URISyntaxException exception) {
			throw new InvalidRequestException(fieldName + " must be a valid URL");
		}
	}
}
