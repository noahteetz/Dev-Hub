package com.devhub.backend.service;

import static com.devhub.backend.service.ProviderSupport.bool;
import static com.devhub.backend.service.ProviderSupport.decodeBase64;
import static com.devhub.backend.service.ProviderSupport.headerValue;
import static com.devhub.backend.service.ProviderSupport.instant;
import static com.devhub.backend.service.ProviderSupport.percentages;
import static com.devhub.backend.service.ProviderSupport.rateLimit;
import static com.devhub.backend.service.ProviderSupport.text;

import com.devhub.backend.model.RemoteRepository;
import com.devhub.backend.model.RepositoryAccount;
import com.devhub.backend.model.RepositoryCredential;
import com.devhub.backend.model.RepositoryFetch;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryRateLimit;
import com.devhub.backend.model.RepositoryReference;
import com.devhub.backend.model.RepositorySnapshot;
import tools.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class GitLabRepositoryMetadataProvider implements RepositoryMetadataProvider {

	private static final String TOKEN_HEADER = "PRIVATE-TOKEN";
	private static final int PAGE_SIZE = 100;
	private static final int MAX_PAGES = 10;

	private final RestClient restClient;
	private final String host;

	public GitLabRepositoryMetadataProvider(
			RepositoryHttpClientFactory httpClientFactory,
			@Value("${devhub.repository.gitlab.base-url:https://gitlab.com/api/v4}") String baseUrl
	) {
		this.restClient = httpClientFactory.builder()
				.baseUrl(baseUrl)
				.defaultHeader("Accept", "application/json")
				.defaultHeader("User-Agent", "Dev-Hub")
				.build();
		this.host = ProviderSupport.displayHost(baseUrl, "gitlab.com");
	}

	@Override
	public RepositoryProvider provider() {
		return RepositoryProvider.GITLAB;
	}

	@Override
	public String host() {
		return host;
	}

	@Override
	public RepositoryFetch fetch(RepositoryReference reference, RepositoryCredential credential, String etag) {
		String projectId = reference.owner() + "/" + reference.repositoryName();
		ResponseEntity<JsonNode> response = exchange(credential, etag, "/projects/{projectId}", projectId);
		RepositoryRateLimit rateLimit = rateLimit(response.getHeaders());
		boolean conditional = etag != null && !etag.isBlank();
		if (conditional && response.getStatusCode().value() == 304) {
			return RepositoryFetch.notModified(etag, rateLimit);
		}

		JsonNode project = response.getBody();
		if (project == null && conditional) {
			response = exchange(credential, null, "/projects/{projectId}", projectId);
			rateLimit = rateLimit(response.getHeaders());
			project = response.getBody();
		}

		String branch = text(project, "default_branch", "main");
		JsonNode commits = get(
				credential,
				"/projects/{projectId}/repository/commits?ref_name={branch}&per_page=1",
				projectId,
				branch
		);
		JsonNode commit = commits != null && commits.isArray() && !commits.isEmpty() ? commits.get(0) : null;
		JsonNode languages = get(credential, "/projects/{projectId}/languages", projectId);
		JsonNode readme = readme(projectId, branch, credential);
		String webUrl = text(project, "web_url", reference.canonicalUrl());
		RepositorySnapshot snapshot = new RepositorySnapshot(
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
		return RepositoryFetch.of(headerValue(response.getHeaders(), HttpHeaders.ETAG), snapshot, rateLimit);
	}

	@Override
	public RepositoryAccount verify(RepositoryCredential credential) {
		JsonNode user = get(credential, "/user");
		return new RepositoryAccount(text(user, "username", ""), scopes(credential));
	}

	@Override
	public List<RemoteRepository> listRepositories(RepositoryCredential credential) {
		List<RemoteRepository> repositories = new ArrayList<>();
		for (int page = 1; page <= MAX_PAGES; page++) {
			JsonNode body = get(
					credential,
					"/projects?membership=true&min_access_level=20&order_by=last_activity_at&per_page={size}&page={page}",
					PAGE_SIZE,
					page
			);
			if (body == null || !body.isArray() || body.isEmpty()) {
				break;
			}
			for (JsonNode entry : body) {
				repositories.add(toRemoteRepository(entry));
			}
			if (body.size() < PAGE_SIZE) {
				break;
			}
		}
		return List.copyOf(repositories);
	}

	/** Token scopes come from a separate endpoint that older tokens may not reach. */
	private List<String> scopes(RepositoryCredential credential) {
		try {
			JsonNode token = get(credential, "/personal_access_tokens/self");
			JsonNode scopes = ProviderSupport.child(token, "scopes");
			if (scopes == null || !scopes.isArray()) {
				return List.of();
			}
			List<String> values = new ArrayList<>();
			for (JsonNode scope : scopes) {
				values.add(scope.asText(""));
			}
			return List.copyOf(values);
		} catch (RestClientResponseException exception) {
			return List.of();
		}
	}

	private static RemoteRepository toRemoteRepository(JsonNode entry) {
		String fullName = text(entry, "path_with_namespace", "");
		int separator = fullName.lastIndexOf('/');
		String owner = separator > 0
				? fullName.substring(0, separator)
				: text(ProviderSupport.child(entry, "namespace"), "full_path", "");
		String name = separator > 0 ? fullName.substring(separator + 1) : text(entry, "path", "");
		return new RemoteRepository(
				RepositoryProvider.GITLAB,
				owner,
				name,
				fullName,
				text(entry, "description", ""),
				!"public".equals(text(entry, "visibility", "private")),
				bool(entry, "archived"),
				text(entry, "default_branch", ""),
				instant(entry, "last_activity_at"),
				"",
				text(entry, "web_url", "")
		);
	}

	private JsonNode readme(String projectId, String branch, RepositoryCredential credential) {
		try {
			return get(
					credential,
					"/projects/{projectId}/repository/files/README.md?ref={branch}",
					projectId,
					branch
			);
		} catch (RestClientResponseException exception) {
			if (exception.getStatusCode().value() == 404) {
				return null;
			}
			throw exception;
		}
	}

	private JsonNode get(RepositoryCredential credential, String path, Object... uriVariables) {
		return restClient.get()
				.uri(path, uriVariables)
				.headers(headers -> authorize(headers, credential))
				.retrieve()
				.body(JsonNode.class);
	}

	private ResponseEntity<JsonNode> exchange(
			RepositoryCredential credential,
			String etag,
			String path,
			Object... uriVariables
	) {
		return restClient.get()
				.uri(path, uriVariables)
				.headers(headers -> {
					authorize(headers, credential);
					if (etag != null && !etag.isBlank()) {
						headers.setIfNoneMatch(etag);
					}
				})
				.retrieve()
				.toEntity(JsonNode.class);
	}

	private static void authorize(HttpHeaders headers, RepositoryCredential credential) {
		if (credential != null && credential.hasToken()) {
			headers.set(TOKEN_HEADER, credential.token());
		}
	}
}
