package com.devhub.backend.service;

import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.RepositoryConnection;
import com.devhub.backend.model.RepositoryCredential;
import com.devhub.backend.model.RepositoryFetch;
import com.devhub.backend.model.RepositoryMetadata;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryRateLimit;
import com.devhub.backend.model.RepositoryReference;
import com.devhub.backend.model.RepositorySyncStatus;
import com.devhub.backend.repository.ProjectRepository;
import com.devhub.backend.repository.RepositoryMetadataRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class RepositoryMetadataService {

	private final ProjectRepository projectRepository;
	private final RepositoryMetadataRepository metadataRepository;
	private final RepositoryUrlParser urlParser;
	private final GitCredentialService credentialService;
	private final List<RepositoryMetadataProvider> providers;

	public RepositoryMetadataService(
			ProjectRepository projectRepository,
			RepositoryMetadataRepository metadataRepository,
			RepositoryUrlParser urlParser,
			GitCredentialService credentialService,
			List<RepositoryMetadataProvider> providers
	) {
		this.projectRepository = projectRepository;
		this.metadataRepository = metadataRepository;
		this.urlParser = urlParser;
		this.credentialService = credentialService;
		this.providers = providers;
	}

	public RepositoryConnection find(long projectId) {
		Project project = getProject(projectId);
		return connection(project);
	}

	public RepositoryConnection refresh(long projectId) {
		Project project = getProject(projectId);
		if (project.repositoryUrl() == null || project.repositoryUrl().isBlank()) {
			throw new InvalidRequestException("Project has no repository URL");
		}

		RepositoryReference reference = urlParser.parse(project.repositoryUrl());
		if (reference.provider() == RepositoryProvider.GENERIC) {
			metadataRepository.saveFailure(
					projectId,
					reference,
					RepositorySyncStatus.UNSUPPORTED,
					"UNSUPPORTED",
					"This repository provider is not supported yet.",
					RepositoryRateLimit.UNKNOWN
			);
			return connection(project);
		}

		RepositoryMetadataProvider provider = providers.stream()
				.filter(candidate -> candidate.provider() == reference.provider())
				.findFirst()
				.orElseThrow(() -> new IllegalStateException("No provider registered for " + reference.provider()));
		RepositoryCredential credential = credentialService.credentialFor(reference.provider()).orElse(null);
		CredentialState credentialState = credentialState(reference.provider(), credential);
		String etag = metadataRepository.findByProjectId(projectId)
				.map(RepositoryMetadata::etag)
				.orElse("");

		metadataRepository.markSyncing(projectId, reference);
		try {
			RepositoryFetch fetch = provider.fetch(reference, credential, etag);
			if (fetch.notModified()) {
				metadataRepository.markUnchanged(projectId, fetch.etag(), fetch.rateLimit());
			} else {
				metadataRepository.saveSuccess(projectId, reference, fetch.snapshot(), fetch.etag(), fetch.rateLimit());
			}
		} catch (RestClientResponseException exception) {
			int statusCode = exception.getStatusCode().value();
			RepositoryRateLimit rateLimit = ProviderSupport.rateLimit(exception.getResponseHeaders());
			metadataRepository.saveFailure(
					projectId,
					reference,
					statusFor(statusCode, credentialState, rateLimit),
					"HTTP_" + statusCode,
					messageFor(statusCode, credentialState, rateLimit, reference.provider()),
					rateLimit
			);
		} catch (ResourceAccessException exception) {
			metadataRepository.saveFailure(
					projectId,
					reference,
					RepositorySyncStatus.FAILED,
					"NETWORK_ERROR",
					"The repository provider could not be reached.",
					RepositoryRateLimit.UNKNOWN
			);
		}
		return connection(project);
	}

	private CredentialState credentialState(RepositoryProvider provider, RepositoryCredential credential) {
		if (credential != null && credential.hasToken()) {
			return CredentialState.USABLE;
		}
		return credentialService.hasCredential(provider) ? CredentialState.UNREADABLE : CredentialState.MISSING;
	}

	private RepositoryConnection connection(Project project) {
		if (project.repositoryUrl() == null || project.repositoryUrl().isBlank()) {
			return new RepositoryConnection(project.id(), "", null, "", "", "", null);
		}
		RepositoryReference reference = urlParser.parse(project.repositoryUrl());
		RepositoryMetadata metadata = metadataRepository.findByProjectId(project.id()).orElse(null);
		return new RepositoryConnection(
				project.id(),
				project.repositoryUrl(),
				reference.provider(),
				reference.owner(),
				reference.repositoryName(),
				reference.canonicalUrl(),
				metadata
		);
	}

	private Project getProject(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		return projectRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Project " + id + " was not found"));
	}

	/**
	 * Whether a token was available for this call. The same HTTP status means different
	 * things with and without one, and the message has to say what to do next.
	 */
	private enum CredentialState {
		USABLE,
		/** A token is stored but could not be decrypted, usually after a key change. */
		UNREADABLE,
		MISSING
	}

	private static RepositorySyncStatus statusFor(
			int statusCode,
			CredentialState credentialState,
			RepositoryRateLimit rateLimit
	) {
		if (statusCode == 429) {
			return RepositorySyncStatus.RATE_LIMITED;
		}
		if (statusCode == 403) {
			// GitHub answers 403 both for an exhausted quota and for a token that may not look.
			if (rateLimit.remaining() != null && rateLimit.remaining() == 0) {
				return RepositorySyncStatus.RATE_LIMITED;
			}
			return credentialState == CredentialState.USABLE
					? RepositorySyncStatus.CREDENTIAL_INSUFFICIENT
					: RepositorySyncStatus.PRIVATE_OR_NOT_FOUND;
		}
		if (statusCode == 401) {
			return credentialState == CredentialState.MISSING
					? RepositorySyncStatus.PRIVATE_OR_NOT_FOUND
					: RepositorySyncStatus.CREDENTIAL_INVALID;
		}
		if (statusCode == 404) {
			return RepositorySyncStatus.PRIVATE_OR_NOT_FOUND;
		}
		return RepositorySyncStatus.FAILED;
	}

	private static String messageFor(
			int statusCode,
			CredentialState credentialState,
			RepositoryRateLimit rateLimit,
			RepositoryProvider provider
	) {
		String providerName = provider == RepositoryProvider.GITLAB ? "GitLab" : "GitHub";
		if (statusCode == 429 || (statusCode == 403 && rateLimit.remaining() != null && rateLimit.remaining() == 0)) {
			return rateLimit.resetAt() == null
					? "The provider rate limit was reached. Try again later."
					: "The provider rate limit was reached. It resets at " + rateLimit.resetAt() + ".";
		}
		if (credentialState == CredentialState.UNREADABLE) {
			return "The stored " + providerName + " token could not be read. Enter it again in the settings.";
		}
		if (statusCode == 401) {
			return credentialState == CredentialState.MISSING
					? "The repository is private. Add a " + providerName + " token in the settings."
					: "The stored " + providerName + " token was rejected. Update it in the settings.";
		}
		if (statusCode == 403) {
			return credentialState == CredentialState.USABLE
					? "The " + providerName + " token is missing a scope for this repository, or it is not authorized for the organization."
					: "The repository is private. Add a " + providerName + " token in the settings.";
		}
		if (statusCode == 404) {
			return credentialState == CredentialState.MISSING
					? "The repository is private or does not exist. Add a " + providerName + " token in the settings to reach private repositories."
					: "The repository does not exist, or the account behind the token cannot see it.";
		}
		return "The repository provider returned an error.";
	}
}
