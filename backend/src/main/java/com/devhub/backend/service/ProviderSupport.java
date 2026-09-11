package com.devhub.backend.service;

import com.devhub.backend.model.RepositoryRateLimit;
import tools.jackson.databind.JsonNode;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;

/** Reading helpers shared by the provider clients. All of them tolerate missing fields. */
final class ProviderSupport {

	private ProviderSupport() {
	}

	/**
	 * The host a token belongs to, derived from the configured API base URL. The leading
	 * {@code api.} of the GitHub endpoint is dropped so the value reads like the web host.
	 */
	static String displayHost(String baseUrl, String fallback) {
		try {
			String host = new URI(baseUrl).getHost();
			if (host == null || host.isBlank()) {
				return fallback;
			}
			host = host.toLowerCase();
			return host.startsWith("api.") ? host.substring(4) : host;
		} catch (URISyntaxException exception) {
			return fallback;
		}
	}

	/** Reads the quota headers, accepting both the GitHub and the GitLab spelling. */
	static RepositoryRateLimit rateLimit(HttpHeaders headers) {
		Integer limit = firstInteger(headers, "x-ratelimit-limit", "ratelimit-limit");
		Integer remaining = firstInteger(headers, "x-ratelimit-remaining", "ratelimit-remaining");
		Integer reset = firstInteger(headers, "x-ratelimit-reset", "ratelimit-reset");
		if (limit == null && remaining == null && reset == null) {
			return RepositoryRateLimit.UNKNOWN;
		}
		return new RepositoryRateLimit(limit, remaining, reset == null ? null : epochSeconds(reset));
	}

	static String headerValue(HttpHeaders headers, String name) {
		return headers == null ? null : headers.getFirst(name);
	}

	/** Null-safe navigation, so a provider answer with a missing branch never throws. */
	static JsonNode child(JsonNode node, String field) {
		JsonNode value = node == null ? null : node.get(field);
		return value == null || value.isNull() ? null : value;
	}

	static String text(JsonNode node, String field, String fallback) {
		JsonNode value = node == null ? null : node.get(field);
		return value == null || value.isNull() ? fallback : value.asText(fallback);
	}

	static boolean bool(JsonNode node, String field) {
		JsonNode value = node == null ? null : node.get(field);
		return value != null && value.asBoolean(false);
	}

	static Instant instant(JsonNode node, String field) {
		String value = text(node, field, "");
		if (value.isBlank()) {
			return null;
		}
		try {
			return Instant.parse(value);
		} catch (RuntimeException exception) {
			return null;
		}
	}

	static String decodeBase64(String value) {
		if (value == null || value.isBlank()) {
			return "";
		}
		try {
			return new String(Base64.getMimeDecoder().decode(value), StandardCharsets.UTF_8).trim();
		} catch (IllegalArgumentException exception) {
			return "";
		}
	}

	/** Turns raw byte counts per language into percentages rounded to one decimal. */
	static Map<String, Double> percentages(JsonNode node) {
		Map<String, Double> result = new LinkedHashMap<>();
		if (node == null || !node.isObject()) {
			return result;
		}
		double total = 0;
		for (JsonNode value : node) {
			total += value.asDouble();
		}
		if (total <= 0) {
			return result;
		}
		for (Map.Entry<String, JsonNode> entry : node.properties()) {
			result.put(entry.getKey(), Math.round(entry.getValue().asDouble() * 1000.0 / total) / 10.0);
		}
		return result;
	}

	private static Integer firstInteger(HttpHeaders headers, String... names) {
		for (String name : names) {
			String value = headerValue(headers, name);
			if (value != null && !value.isBlank()) {
				try {
					return Integer.valueOf(value.trim());
				} catch (NumberFormatException exception) {
					return null;
				}
			}
		}
		return null;
	}

	private static Instant epochSeconds(int value) {
		try {
			return Instant.ofEpochSecond(value);
		} catch (RuntimeException exception) {
			return null;
		}
	}
}
