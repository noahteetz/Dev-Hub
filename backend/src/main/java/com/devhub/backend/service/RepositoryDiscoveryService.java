package com.devhub.backend.service;

import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.UpstreamException;
import com.devhub.backend.model.RemoteRepository;
import com.devhub.backend.model.RepositoryCredential;
import com.devhub.backend.model.RepositoryOwner;
import com.devhub.backend.model.RepositoryOwnerType;
import com.devhub.backend.model.RepositoryProvider;
import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Lists the repositories a stored token can reach, so a project is connected by picking
 * one instead of pasting a URL.
 *
 * <p>The provider answer is cached for a short while because the picker filters as the
 * user types. The cache is dropped as soon as the token behind it changes or is removed,
 * so a deleted token never keeps a listing alive.</p>
 */
@Service
public class RepositoryDiscoveryService {

	private final GitCredentialService credentialService;
	private final Duration cacheTtl;
	private final Map<RepositoryProvider, CacheEntry> cache = new ConcurrentHashMap<>();

	public RepositoryDiscoveryService(
			GitCredentialService credentialService,
			@Value("${devhub.repository.discovery.cache-ttl:5m}") Duration cacheTtl
	) {
		this.credentialService = credentialService;
		this.cacheTtl = cacheTtl == null || cacheTtl.isNegative() ? Duration.ofMinutes(5) : cacheTtl;
	}

	@PostConstruct
	void subscribeToCredentialChanges() {
		credentialService.onCredentialChanged(cache::remove);
	}

	/**
	 * @param query matched against the full name and the description, case-insensitive
	 * @param owner limits the answer to one account or organization
	 */
	public List<RemoteRepository> list(RepositoryProvider provider, String query, String owner) {
		String term = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
		String ownerFilter = owner == null ? "" : owner.trim();
		return all(provider).stream()
				.filter(repository -> ownerFilter.isBlank() || ownerFilter.equalsIgnoreCase(repository.owner()))
				.filter(repository -> term.isEmpty() || matches(repository, term))
				.toList();
	}

	/** The accounts behind the listing, derived from it so the counts always agree. */
	public List<RepositoryOwner> owners(RepositoryProvider provider) {
		List<RemoteRepository> repositories = all(provider);
		String account = credentialService.findByProvider(provider).accountLogin();
		Map<String, Integer> counts = new LinkedHashMap<>();
		for (RemoteRepository repository : repositories) {
			counts.merge(repository.owner(), 1, Integer::sum);
		}
		List<RepositoryOwner> owners = new ArrayList<>();
		counts.forEach((login, count) -> owners.add(new RepositoryOwner(
				login,
				login,
				login.equalsIgnoreCase(account) ? RepositoryOwnerType.USER : RepositoryOwnerType.ORGANIZATION,
				count
		)));
		owners.sort(Comparator
				.comparing((RepositoryOwner candidate) -> candidate.type() == RepositoryOwnerType.USER ? 0 : 1)
				.thenComparing(RepositoryOwner::login, String.CASE_INSENSITIVE_ORDER));
		return List.copyOf(owners);
	}

	/** Forces the next listing to call the provider again. */
	public void invalidate(RepositoryProvider provider) {
		cache.remove(provider);
	}

	private List<RemoteRepository> all(RepositoryProvider provider) {
		CacheEntry cached = cache.get(provider);
		if (cached != null && !cached.isExpired(cacheTtl)) {
			return cached.repositories();
		}

		RepositoryCredential credential = credentialService.credentialFor(provider)
				.orElseThrow(() -> new InvalidRequestException(
						credentialService.hasCredential(provider)
								? "The stored token could not be read. Enter it again in the settings."
								: "No token is stored for this provider. Add one in the settings."
				));
		RepositoryMetadataProvider client = credentialService.clientFor(provider);
		List<RemoteRepository> repositories;
		try {
			repositories = client.listRepositories(credential);
		} catch (RestClientResponseException exception) {
			throw new InvalidRequestException(listingMessage(exception.getStatusCode().value()));
		} catch (ResourceAccessException exception) {
			throw new UpstreamException("The provider could not be reached.");
		}
		List<RemoteRepository> sorted = repositories.stream()
				.sorted(Comparator.comparing(
						RemoteRepository::lastActivityAt,
						Comparator.nullsLast(Comparator.reverseOrder())
				))
				.toList();
		cache.put(provider, new CacheEntry(sorted, Instant.now()));
		return sorted;
	}

	private static boolean matches(RemoteRepository repository, String term) {
		return repository.fullName().toLowerCase(Locale.ROOT).contains(term)
				|| repository.description().toLowerCase(Locale.ROOT).contains(term);
	}

	private static String listingMessage(int statusCode) {
		return switch (statusCode) {
			case 401 -> "The stored token was rejected. Update it in the settings.";
			case 403 -> "The token is missing a scope for listing repositories, or it is not authorized for the organization.";
			case 429 -> "The provider rate limit was reached. Try again later.";
			default -> "The provider answered with HTTP " + statusCode + ".";
		};
	}

	private record CacheEntry(List<RemoteRepository> repositories, Instant loadedAt) {
		boolean isExpired(Duration ttl) {
			return loadedAt.plus(ttl).isBefore(Instant.now());
		}
	}
}
