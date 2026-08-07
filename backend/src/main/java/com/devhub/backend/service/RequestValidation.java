package com.devhub.backend.service;

import com.devhub.backend.exception.InvalidRequestException;

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
}
