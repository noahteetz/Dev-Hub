package com.devhub.backend.service;

import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryReference;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class RepositoryUrlParser {

	private static final Pattern SCP_URL = Pattern.compile("^git@([^:]+):(.+)$");

	public RepositoryReference parse(String input) {
		if (input == null || input.isBlank()) {
			throw new InvalidRequestException("Repository URL is required");
		}

		String value = input.trim();
		String host;
		String path;
		Matcher scp = SCP_URL.matcher(value);
		if (scp.matches()) {
			host = scp.group(1).toLowerCase();
			path = scp.group(2);
		} else {
			try {
				URI uri = new URI(value);
				if (uri.getHost() == null || uri.getPath() == null || uri.getPath().isBlank()) {
					throw new InvalidRequestException("Repository URL must contain a host and repository path");
				}
				host = uri.getHost().toLowerCase();
				path = uri.getPath();
			} catch (URISyntaxException exception) {
				throw new InvalidRequestException("Repository URL must be a valid Git URL");
			}
		}

		List<String> segments = Arrays.stream(URLDecoder.decode(path, StandardCharsets.UTF_8).split("/"))
				.map(String::trim)
				.filter(segment -> !segment.isBlank())
				.toList();
		if (segments.isEmpty()) {
			throw new InvalidRequestException("Repository URL must contain a repository path");
		}

		String repositoryName = removeGitSuffix(segments.get(segments.size() - 1));
		if (repositoryName.isBlank()) {
			throw new InvalidRequestException("Repository URL must contain a repository name");
		}
		RepositoryProvider provider = providerFor(host);
		if (provider != RepositoryProvider.GENERIC && segments.size() < 2) {
			throw new InvalidRequestException("Repository URL must contain an owner and repository name");
		}
		String owner = segments.size() < 2 ? "" : String.join("/", segments.subList(0, segments.size() - 1));
		String canonicalPath = String.join("/", segments.subList(0, segments.size() - 1))
				+ "/" + repositoryName;
		String canonicalUrl = "https://" + host + "/" + canonicalPath;
		return new RepositoryReference(provider, owner, repositoryName, canonicalUrl);
	}

	private static RepositoryProvider providerFor(String host) {
		if ("github.com".equals(host)) {
			return RepositoryProvider.GITHUB;
		}
		if ("gitlab.com".equals(host)) {
			return RepositoryProvider.GITLAB;
		}
		return RepositoryProvider.GENERIC;
	}

	private static String removeGitSuffix(String value) {
		return value.endsWith(".git") ? value.substring(0, value.length() - 4) : value;
	}
}