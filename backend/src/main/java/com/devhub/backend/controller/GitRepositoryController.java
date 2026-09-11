package com.devhub.backend.controller;

import com.devhub.backend.dto.RepositoryImportRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.RemoteRepository;
import com.devhub.backend.model.RepositoryOwner;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.service.RepositoryDiscoveryService;
import com.devhub.backend.service.RepositoryImportService;
import java.util.List;
import java.util.Locale;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The repositories a stored token can reach, and the bulk import built on top of them. */
@RestController
@RequestMapping("/api/git-repositories")
public class GitRepositoryController {

	private final RepositoryDiscoveryService discoveryService;
	private final RepositoryImportService importService;

	public GitRepositoryController(
			RepositoryDiscoveryService discoveryService,
			RepositoryImportService importService
	) {
		this.discoveryService = discoveryService;
		this.importService = importService;
	}

	@GetMapping
	public List<RemoteRepository> list(
			@RequestParam("provider") String provider,
			@RequestParam(name = "query", required = false) String query,
			@RequestParam(name = "owner", required = false) String owner
	) {
		return discoveryService.list(parse(provider), query, owner);
	}

	@GetMapping("/owners")
	public List<RepositoryOwner> owners(@RequestParam("provider") String provider) {
		return discoveryService.owners(parse(provider));
	}

	@PostMapping("/refresh")
	public List<RemoteRepository> refresh(@RequestParam("provider") String provider) {
		RepositoryProvider parsed = parse(provider);
		discoveryService.invalidate(parsed);
		return discoveryService.list(parsed, "", "");
	}

	@PostMapping("/import")
	public RepositoryImportService.ImportResult importRepositories(
			@RequestBody(required = false) RepositoryImportRequest request
	) {
		return importService.importRepositories(request);
	}

	private static RepositoryProvider parse(String provider) {
		if (provider == null || provider.isBlank()) {
			throw new InvalidRequestException("Provider is required");
		}
		try {
			RepositoryProvider parsed = RepositoryProvider.valueOf(provider.toUpperCase(Locale.ROOT));
			if (parsed == RepositoryProvider.GENERIC) {
				throw new InvalidRequestException("Repository listing is available for GitHub and GitLab only");
			}
			return parsed;
		} catch (IllegalArgumentException exception) {
			throw new InvalidRequestException("Unknown provider: " + provider);
		}
	}
}
