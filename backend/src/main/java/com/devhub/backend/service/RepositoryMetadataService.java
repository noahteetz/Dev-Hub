package com.devhub.backend.service;

import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.RepositoryConnection;
import com.devhub.backend.model.RepositoryMetadata;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryReference;
import com.devhub.backend.model.RepositorySnapshot;
import com.devhub.backend.model.RepositorySyncStatus;
import com.devhub.backend.repository.ProjectRepository;
import com.devhub.backend.repository.RepositoryMetadataRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class RepositoryMetadataService {

	private final ProjectRepository projectRepository;
	private final RepositoryMetadataRepository metadataRepository;
	private final RepositoryUrlParser urlParser;
	private final List<RepositoryMetadataProvider> providers;

	public RepositoryMetadataService(
			ProjectRepository projectRepository,
			RepositoryMetadataRepository metadataRepository,
			RepositoryUrlParser urlParser,
			List<RepositoryMetadataProvider> providers
	) {
		this.projectRepository = projectRepository;
		this.metadataRepository = metadataRepository;
		this.urlParser = urlParser;
		this.providers = providers;
	}

	public RepositoryConnection find(long projectId) {
		Project project = getProject(projectId);
		return connection(project);
	}

	@Transactional
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
					"This repository provider is not supported yet."
			);
			return connection(project);
		}

		RepositoryMetadataProvider provider = providers.stream()
				.filter(candidate -> candidate.provider() == reference.provider())
				.findFirst()
				.orElseThrow(() -> new IllegalStateException("No provider registered for " + reference.provider()));
		metadataRepository.markSyncing(projectId, reference);
		try {
			RepositorySnapshot snapshot = provider.fetch(reference);
			metadataRepository.saveSuccess(projectId, reference, snapshot);
		} catch (RestClientResponseException exception) {
			metadataRepository.saveFailure(
					projectId,
					reference,
					statusFor(exception.getStatusCode().value()),
					"HTTP_" + exception.getStatusCode().value(),
					messageFor(exception.getStatusCode().value())
			);
		} catch (ResourceAccessException exception) {
			metadataRepository.saveFailure(
					projectId,
					reference,
					RepositorySyncStatus.FAILED,
					"NETWORK_ERROR",
					"The repository provider could not be reached."
			);
		}
		return connection(project);
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

	private static RepositorySyncStatus statusFor(int statusCode) {
		if (statusCode == 429) {
			return RepositorySyncStatus.RATE_LIMITED;
		}
		if (statusCode == 401 || statusCode == 403 || statusCode == 404) {
			return RepositorySyncStatus.PRIVATE_OR_NOT_FOUND;
		}
		return RepositorySyncStatus.FAILED;
	}

	private static String messageFor(int statusCode) {
		if (statusCode == 401 || statusCode == 403 || statusCode == 404) {
			return "The repository is private or could not be found.";
		}
		if (statusCode == 429) {
			return "The provider rate limit was reached. Try again later.";
		}
		return "The repository provider returned an error.";
	}
}