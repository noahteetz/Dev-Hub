package com.devhub.backend.service;

import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.dto.RepositoryImportRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.RemoteRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;

/**
 * Creates one project per selected repository. Only repositories the stored token can
 * actually see are accepted, so a crafted request cannot invent projects.
 */
@Service
public class RepositoryImportService {

	private static final int MAX_PER_REQUEST = 100;

	private final RepositoryDiscoveryService discoveryService;
	private final ProjectService projectService;
	private final RepositoryUrlParser urlParser;

	public RepositoryImportService(
			RepositoryDiscoveryService discoveryService,
			ProjectService projectService,
			RepositoryUrlParser urlParser
	) {
		this.discoveryService = discoveryService;
		this.projectService = projectService;
		this.urlParser = urlParser;
	}

	public ImportResult importRepositories(RepositoryImportRequest request) {
		if (request == null || request.provider() == null) {
			throw new InvalidRequestException("Provider is required");
		}
		List<String> requested = request.fullNames() == null ? List.of() : request.fullNames().stream()
				.filter(name -> name != null && !name.isBlank())
				.map(String::trim)
				.distinct()
				.toList();
		if (requested.isEmpty()) {
			throw new InvalidRequestException("Select at least one repository");
		}
		if (requested.size() > MAX_PER_REQUEST) {
			throw new InvalidRequestException("At most " + MAX_PER_REQUEST + " repositories can be imported at once");
		}

		Map<String, RemoteRepository> available = discoveryService.list(request.provider(), "", "").stream()
				.collect(Collectors.toMap(
						repository -> repository.fullName().toLowerCase(Locale.ROOT),
						Function.identity(),
						(first, second) -> first
				));
		Set<String> connected = connectedRepositoryUrls();

		List<Project> created = new ArrayList<>();
		List<String> skipped = new ArrayList<>();
		for (String fullName : requested) {
			RemoteRepository repository = available.get(fullName.toLowerCase(Locale.ROOT));
			if (repository == null) {
				skipped.add(fullName);
				continue;
			}
			String canonicalUrl = canonical(repository.webUrl());
			if (canonicalUrl.isBlank() || !connected.add(canonicalUrl)) {
				skipped.add(fullName);
				continue;
			}
			created.add(projectService.create(new ProjectRequest(
					repository.name(),
					repository.description(),
					repository.webUrl(),
					"",
					List.of()
			)));
		}
		return new ImportResult(List.copyOf(created), List.copyOf(skipped));
	}

	/** Canonical URLs of every project that already points at a repository, archived included. */
	private Set<String> connectedRepositoryUrls() {
		return Stream.concat(projectService.findAll(false).stream(), projectService.findAll(true).stream())
				.map(Project::repositoryUrl)
				.filter(url -> url != null && !url.isBlank())
				.map(this::canonical)
				.filter(url -> !url.isBlank())
				.collect(Collectors.toCollection(HashSet::new));
	}

	private String canonical(String repositoryUrl) {
		try {
			return urlParser.parse(repositoryUrl).canonicalUrl().toLowerCase(Locale.ROOT);
		} catch (RuntimeException exception) {
			return "";
		}
	}

	/**
	 * @param skipped repositories that were already connected or are no longer visible
	 */
	public record ImportResult(List<Project> created, List<String> skipped) {
	}

}
