package com.devhub.backend.service;

import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryReference;
import com.devhub.backend.model.RepositorySnapshot;
import tools.jackson.databind.JsonNode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class GitLabRepositoryMetadataProvider implements RepositoryMetadataProvider {

	private final RestClient restClient;

	public GitLabRepositoryMetadataProvider(RepositoryHttpClientFactory httpClientFactory) {
		this.restClient = httpClientFactory.builder()
				.baseUrl("https://gitlab.com/api/v4")
				.defaultHeader("Accept", "application/json")
				.defaultHeader("User-Agent", "Dev-Hub")
				.build();
	}

	@Override
	public RepositoryProvider provider() {
		return RepositoryProvider.GITLAB;
	}

	@Override
	public RepositorySnapshot fetch(RepositoryReference reference) {
		String projectId = encode(reference.owner() + "/" + reference.repositoryName());
		JsonNode project = get("/projects/" + projectId);
		String branch = text(project, "default_branch", "main");
		JsonNode commits = get("/projects/" + projectId + "/repository/commits?ref_name=" + encode(branch) + "&per_page=1");
		JsonNode commit = commits != null && commits.isArray() && !commits.isEmpty() ? commits.get(0) : null;
		JsonNode languages = get("/projects/" + projectId + "/languages");
		JsonNode readme = readme(projectId, branch);
		String webUrl = text(project, "web_url", reference.canonicalUrl());
		return new RepositorySnapshot(
				branch,
				text(commit, "id", ""),
				text(commit, "title", ""),
				text(commit, "author_name", ""),
				instant(commit, "committed_date"),
				readme == null ? "" : "README.md",
				readme == null ? "" : decodeBase64(text(readme, "content", "")),
				percentages(languages),
				webUrl + "/-/branches",
				webUrl + "/-/issues",
				webUrl + "/-/merge_requests"
		);
	}

	private JsonNode readme(String projectId, String branch) {
		try {
			return get("/projects/" + projectId + "/repository/files/README.md?ref=" + encode(branch));
		} catch (RestClientResponseException exception) {
			if (exception.getStatusCode().value() == 404) {
				return null;
			}
			throw exception;
		}
	}

	private JsonNode get(String path) {
		return restClient.get().uri(path).retrieve().body(JsonNode.class);
	}

	private static String encode(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
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
		return new String(java.util.Base64.getDecoder().decode(value.replaceAll("\\s", "")), StandardCharsets.UTF_8).trim();
	}

	private static Map<String, Double> percentages(JsonNode node) {
		Map<String, Double> result = new LinkedHashMap<>();
		if (node == null || !node.isObject()) {
			return result;
		}
		double total = 0;
		for (JsonNode value : node) {
			total += value.asDouble();
		}
		if (total == 0) {
			return result;
		}
		for (Map.Entry<String, JsonNode> entry : node.properties()) {
			result.put(entry.getKey(), Math.round(entry.getValue().asDouble() * 1000.0 / total) / 10.0);
		}
		return result;
	}
}