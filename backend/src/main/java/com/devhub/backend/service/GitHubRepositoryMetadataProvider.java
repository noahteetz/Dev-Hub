package com.devhub.backend.service;

import static com.devhub.backend.service.ProviderSupport.bool;
import static com.devhub.backend.service.ProviderSupport.child;
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
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class GitHubRepositoryMetadataProvider implements RepositoryMetadataProvider {

	private static final int PAGE_SIZE = 100;
	private static final int MAX_PAGES = 10;

	private final RestClient restClient;
	private final String host;

	public GitHubRepositoryMetadataProvider(
			RepositoryHttpClientFactory httpClientFactory,
			@Value("${devhub.repository.github.base-url:https://api.github.com}") String baseUrl
	) {
		this.restClient = httpClientFactory.builder()
				.baseUrl(baseUrl)
				.defaultHeader("Accept", "application/vnd.github+json")
				.defaultHeader("X-GitHub-Api-Version", "2022-11-28")
				.defaultHeader("User-Agent", "Dev-Hub")
				.build();
		this.host = ProviderSupport.displayHost(baseUrl, "github.com");
	}

	@Override
	public RepositoryProvider provider() {
		return RepositoryProvider.GITHUB;
	}

	@Override
	public String host() {
		return host;
	}

	@Override
	public RepositoryFetch fetch(RepositoryReference reference, RepositoryCredential credential, String etag) {
		ResponseEntity<JsonNode> response = exchange(
				credential,
				etag,
				"/repos/{owner}/{name}",
				reference.owner(),
				reference.repositoryName()
		);
		RepositoryRateLimit rateLimit = rateLimit(response.getHeaders());
		boolean conditional = etag != null && !etag.isBlank();
		if (conditional && response.getStatusCode().value() == 304) {
			return RepositoryFetch.notModified(etag, rateLimit);
		}

		JsonNode repository = response.getBody();
		if (repository == null && conditional) {
			// An empty body on a conditional read that was not a 304 tells us nothing; read again.
			response = exchange(credential, null, "/repos/{owner}/{name}", reference.owner(), reference.repositoryName());
			rateLimit = rateLimit(response.getHeaders());
			repository = response.getBody();
		}

		String branch = text(repository, "default_branch", "main");
		JsonNode commit = get(credential, "/repos/{owner}/{name}/commits/{branch}", reference.owner(), reference.repositoryName(), branch);
		JsonNode languages = get(credential, "/repos/{owner}/{name}/languages", reference.owner(), reference.repositoryName());
		JsonNode readme = readme(reference, credential);
		String webUrl = text(repository, "html_url", reference.canonicalUrl());
		JsonNode commitDetails = child(commit, "commit");
		RepositorySnapshot snapshot = new RepositorySnapshot(
				branch,
				text(commit, "sha", ""),
				text(commitDetails, "message", ""),
				text(child(commitDetails, "author"), "name", text(child(commit, "author"), "login", "")),
				instant(child(commitDetails, "author"), "date"),
				readme == null ? "" : text(readme, "name", "README.md"),
				readme == null ? "" : decodeBase64(text(readme, "content", "")),
				percentages(languages),
				webUrl + "/branches",
				webUrl + "/issues",
				webUrl + "/pulls"
		);
		return RepositoryFetch.of(headerValue(response.getHeaders(), HttpHeaders.ETAG), snapshot, rateLimit);
	}

	@Override
	public RepositoryAccount verify(RepositoryCredential credential) {
		ResponseEntity<JsonNode> response = exchange(credential, null, "/user");
		// A classic token reports its scopes in a header; a fine-grained one sends none.
		String scopeHeader = headerValue(response.getHeaders(), "x-oauth-scopes");
		List<String> scopes = scopeHeader == null || scopeHeader.isBlank()
				? List.of()
				: Arrays.stream(scopeHeader.split(","))
						.map(String::trim)
						.filter(scope -> !scope.isBlank())
						.toList();
		return new RepositoryAccount(text(response.getBody(), "login", ""), scopes);
	}

	@Override
	public List<RemoteRepository> listRepositories(RepositoryCredential credential) {
		List<RemoteRepository> repositories = new ArrayList<>();
		for (int page = 1; page <= MAX_PAGES; page++) {
			JsonNode body = get(
					credential,
					"/user/repos?per_page={size}&page={page}&affiliation=owner,organization_member&visibility=all&sort=pushed",
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

	private static RemoteRepository toRemoteRepository(JsonNode entry) {
		String fullName = text(entry, "full_name", "");
		int separator = fullName.lastIndexOf('/');
		String owner = separator > 0 ? fullName.substring(0, separator) : text(child(entry, "owner"), "login", "");
		return new RemoteRepository(
				RepositoryProvider.GITHUB,
				owner,
				text(entry, "name", ""),
				fullName,
				text(entry, "description", ""),
				bool(entry, "private"),
				bool(entry, "archived"),
				text(entry, "default_branch", ""),
				instant(entry, "pushed_at"),
				text(entry, "language", ""),
				text(entry, "html_url", "")
		);
	}

	private JsonNode readme(RepositoryReference reference, RepositoryCredential credential) {
		try {
			return get(credential, "/repos/{owner}/{name}/readme", reference.owner(), reference.repositoryName());
		} catch (RestClientResponseException exception) {
			if (exception.getStatusCode().value() == 404) {
				return null;
			}
			throw exception;
		}
	}

	private JsonNode get(RepositoryCredential credential, String path, Object... variables) {
		return restClient.get()
				.uri(path, variables)
				.headers(headers -> authorize(headers, credential))
				.retrieve()
				.body(JsonNode.class);
	}

	private ResponseEntity<JsonNode> exchange(
			RepositoryCredential credential,
			String etag,
			String path,
			Object... variables
	) {
		return restClient.get()
				.uri(path, variables)
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
			headers.setBearerAuth(credential.token());
		}
	}
}
