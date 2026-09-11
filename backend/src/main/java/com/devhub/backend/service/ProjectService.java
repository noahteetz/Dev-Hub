package com.devhub.backend.service;

import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.dto.ProjectArchiveRequest;
import com.devhub.backend.dto.ProjectContextRequest;
import com.devhub.backend.dto.ProjectLinkRequest;
import com.devhub.backend.dto.ProjectOrganizationRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.ProjectLink;
import com.devhub.backend.model.ProjectStatus;
import com.devhub.backend.repository.ProjectRepository;
import com.devhub.backend.repository.RepositoryMetadataRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
public class ProjectService {

	private final ProjectRepository projectRepository;
	private final RepositoryMetadataRepository repositoryMetadataRepository;

	public ProjectService(
			ProjectRepository projectRepository,
			RepositoryMetadataRepository repositoryMetadataRepository
	) {
		this.projectRepository = projectRepository;
		this.repositoryMetadataRepository = repositoryMetadataRepository;
	}

	@Transactional
	public Project create(ProjectRequest request) {
		ProjectRequest body = RequestValidation.requireRequest(request);
		return projectRepository.create(
				RequestValidation.required(body.name(), "Project name"),
				RequestValidation.optional(body.description()),
				RequestValidation.optionalRepositoryUrl(body.repositoryUrl(), "Repository URL"),
				RequestValidation.optionalUrl(body.deploymentUrl(), "Deployment URL"),
				validateLinks(body.links())
		);
	}

	public List<Project> findAll() {
		return findAll(false);
	}

	public List<Project> findAll(boolean archived) {
		return projectRepository.findAll(archived);
	}

	public Project findById(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		return getExisting(id);
	}

	@Transactional
	public Project update(long projectId, ProjectRequest request) {
		long id = RequestValidation.requireId(projectId, "Project");
		ProjectRequest body = RequestValidation.requireRequest(request);
		Project existing = getExisting(id);
		String repositoryUrl = RequestValidation.optionalRepositoryUrl(body.repositoryUrl(), "Repository URL");
		if (projectRepository.update(
				id,
				RequestValidation.required(body.name(), "Project name"),
				RequestValidation.optional(body.description()),
				repositoryUrl,
				RequestValidation.optionalUrl(body.deploymentUrl(), "Deployment URL"),
				validateLinks(body.links())
		) == 0) {
			throw notFound(id);
		}
		if (!existing.repositoryUrl().equals(repositoryUrl)) {
			repositoryMetadataRepository.deleteByProjectId(id);
		}
		return getExisting(id);
	}

	@Transactional
	public Project updateOrganization(long projectId, ProjectOrganizationRequest request) {
		long id = RequestValidation.requireId(projectId, "Project");
		Project existing = getExisting(id);
		ProjectOrganizationRequest body = RequestValidation.requireRequest(request);
		ProjectStatus status = body.status() == null ? existing.status() : body.status();
		int priority = body.priority() == null ? existing.priority() : body.priority();
		boolean favorite = body.favorite() == null ? existing.favorite() : body.favorite();
		if (priority < 0 || priority > 3) {
			throw new InvalidRequestException("Project priority must be between 0 and 3");
		}
		if (projectRepository.updateOrganization(id, status, priority, favorite) == 0) {
			throw notFound(id);
		}
		return getExisting(id);
	}

	@Transactional
	public Project updateContext(long projectId, ProjectContextRequest request) {
		long id = RequestValidation.requireId(projectId, "Project");
		Project existing = getExisting(id);
		ProjectContextRequest body = RequestValidation.requireRequest(request);
		if (projectRepository.updateContext(
				id,
				RequestValidation.optional(body.progressSummary()),
				RequestValidation.optional(body.nextStep()),
				RequestValidation.optional(body.blockers()),
				RequestValidation.optional(body.startCommand()),
				RequestValidation.optional(body.buildCommand()),
				RequestValidation.optional(body.technicalDecisions())
		) == 0) {
			throw notFound(id);
		}
		return getExisting(id);
	}

	@Transactional
	public Project archive(long projectId, ProjectArchiveRequest request) {
		long id = RequestValidation.requireId(projectId, "Project");
		Project existing = getExisting(id);
		if (existing.status() == ProjectStatus.ARCHIVED) {
			return existing;
		}
		String reason = request == null ? "" : RequestValidation.optional(request.reason());
		projectRepository.archive(id, reason, existing.status());
		return getExisting(id);
	}

	@Transactional
	public Project restore(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		Project existing = getExisting(id);
		if (existing.status() != ProjectStatus.ARCHIVED) {
			return existing;
		}
		ProjectStatus restoredStatus = existing.statusBeforeArchive();
		if (projectRepository.restore(id, restoredStatus == null ? ProjectStatus.PAUSED : restoredStatus) == 0) {
			throw notFound(id);
		}
		return getExisting(id);
	}

	public void delete(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		if (projectRepository.deleteById(id) == 0) {
			throw notFound(id);
		}
	}

	private Project getExisting(long projectId) {
		return projectRepository.findById(projectId)
				.orElseThrow(() -> notFound(projectId));
	}

	private ResourceNotFoundException notFound(long projectId) {
		return new ResourceNotFoundException("Project " + projectId + " was not found");
	}

	private List<ProjectLink> validateLinks(List<ProjectLinkRequest> links) {
		if (links == null || links.isEmpty()) {
			return List.of();
		}

		List<ProjectLink> validated = new ArrayList<>();
		for (ProjectLinkRequest link : links) {
			if (link == null) {
				throw new InvalidRequestException("Project links cannot contain empty entries");
			}
			validated.add(new ProjectLink(
					null,
					null,
					RequestValidation.required(link.label(), "Project link label"),
					RequestValidation.requiredUrl(link.url(), "Project link URL"),
					validated.size()
			));
		}
		return validated;
	}
}
