package com.devhub.backend.service;

import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryReference;
import com.devhub.backend.model.RepositorySnapshot;
import tools.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class GitHubRepositoryMetadataProvider implements RepositoryMetadataProvider {

	private final RestClient restClient;

	public GitHubRepositoryMetadataProvider(RepositoryHttpClientFactory httpClientFactory) {
		this.restClient = httpClientFactory.builder()
				.baseUrl("https://api.github.com")
				.defaultHeader("Accept", "application/vnd.github+json")
				.defaultHeader("X-GitHub-Api-Version", "2022-11-28")
				.defaultHeader("User-Agent", "Dev-Hub")
				.build();
	}

	@Override
	public RepositoryProvider provider() {
		return RepositoryProvider.GITHUB;
	}

	@Override
	public RepositorySnapshot fetch(RepositoryReference reference) {
		JsonNode repository = get("/repos/{owner}/{name}", reference.owner(), reference.repositoryName());
		String branch = text(repository, "default_branch", "main");
		JsonNode commit = get("/repos/{owner}/{name}/commits/{branch}", reference.owner(), reference.repositoryName(), branch);
		JsonNode languages = get("/repos/{owner}/{name}/languages", reference.owner(), reference.repositoryName());
		JsonNode readme = readme(reference);
		String webUrl = text(repository, "html_url", reference.canonicalUrl());
		return new RepositorySnapshot(
				branch,
				text(commit, "sha", ""),
				text(commit.path("commit"), "message", ""),
				text(commit.path("commit").path("author"), "name", text(commit.path("author"), "login", "")),
				instant(commit.path("commit").path("author"), "date"),
				readme == null ? "" : text(readme, "name", "README.md"),
				readme == null ? "" : decodeBase64(text(readme, "content", "")),
				percentages(languages),
				webUrl + "/branches",
				webUrl + "/issues",
				webUrl + "/pulls"
		);
	}

	private JsonNode readme(RepositoryReference reference) {
		try {
			return get("/repos/{owner}/{name}/readme", reference.owner(), reference.repositoryName());
		} catch (RestClientResponseException exception) {
			if (exception.getStatusCode().value() == 404) {
				return null;
			}
			throw exception;
		}
	}

	private JsonNode get(String path, Object... variables) {
		return restClient.get().uri(path, variables).retrieve().body(JsonNode.class);
	}

	private static String text(JsonNode node, String field, String fallback) {
		JsonNode value = node == null ? null : node.get(field);
		return value == null || value.isNull() ? fallback : value.asText(fallback);
	}

	private static Instant instant(JsonNode node, String field) {
		String value = text(node, field, "");
		return value.isBlank() ? null : Instant.parse(value);
	}

	private static String decodeBase64(String value) {
		if (value.isBlank()) {
			return "";
		}
		return new String(java.util.Base64.getMimeDecoder().decode(value), StandardCharsets.UTF_8).trim();
	}

	private static Map<String, Double> percentages(JsonNode node) {
		long total = 0;
		if (node != null && node.isObject()) {
			for (JsonNode value : node) {
				total += value.asLong();
			}
		}
		Map<String, Double> result = new LinkedHashMap<>();
		if (total == 0 || node == null || !node.isObject()) {
			return result;
		}
		for (Map.Entry<String, JsonNode> entry : node.properties()) {
			result.put(entry.getKey(), Math.round(entry.getValue().asDouble() * 1000.0 / total) / 10.0);
		}
		return result;
	}
}