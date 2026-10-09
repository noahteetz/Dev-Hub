package com.devhub.backend.service;

import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.dto.ProjectArchiveRequest;
import com.devhub.backend.dto.ProjectContextRequest;
import com.devhub.backend.dto.ProjectLinkRequest;
import com.devhub.backend.dto.ProjectOrganizationRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.Permission;
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
	private final ProjectAccessService access;
	private final com.devhub.backend.workspace.WorkspaceRepository workspaces;

	public ProjectService(
			ProjectRepository projectRepository,
			RepositoryMetadataRepository repositoryMetadataRepository,
			ProjectAccessService access,
			com.devhub.backend.workspace.WorkspaceRepository workspaces
	) {
		this.projectRepository = projectRepository;
		this.repositoryMetadataRepository = repositoryMetadataRepository;
		this.access = access;
		this.workspaces = workspaces;
	}

	@Transactional
	public Project create(ProjectRequest request) {
		ProjectRequest body = RequestValidation.requireRequest(request);
		Project created = projectRepository.create(
				RequestValidation.required(body.name(), "Project name"),
				RequestValidation.optional(body.description()),
				RequestValidation.optionalRepositoryUrl(body.repositoryUrl(), "Repository URL"),
				RequestValidation.optionalUrl(body.deploymentUrl(), "Deployment URL"),
				validateLinks(body.links())
		);
		projectRepository.replaceRepositories(created.id(), validateRepositories(created.repositoryUrl(), body.additionalRepositoryUrls()));
		return getExisting(created.id());
	}

	public List<Project> findAll() {
		return findAll(false);
	}

	public List<Project> findAll(boolean archived) {
		return projectRepository.findAll(archived);
	}

	public Project findById(long projectId) {
		long id = access.require(projectId, Permission.READ).projectId();
		return getExisting(id);
	}

	@Transactional
	public Project update(long projectId, ProjectRequest request) {
		long id = access.require(projectId, Permission.EDIT_METADATA).projectId();
		ProjectRequest body = RequestValidation.requireRequest(request);
		workspaces.lockProject(id);
		Project existing = getExisting(id);
		String repositoryUrl = RequestValidation.optionalRepositoryUrl(body.repositoryUrl(), "Repository URL");
		List<String> repositories = validateRepositories(repositoryUrl, body.additionalRepositoryUrls() == null
				? existing.additionalRepositoryUrls() : body.additionalRepositoryUrls());
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
		projectRepository.replaceRepositories(id, repositories);
		if (!existing.repositoryUrl().equals(repositoryUrl)) {
			repositoryMetadataRepository.deleteByProjectId(id);
		}
		return getExisting(id);
	}

	@Transactional
	public Project updateOrganization(long projectId, ProjectOrganizationRequest request) {
		long id = access.require(projectId, Permission.EDIT_METADATA).projectId();
		Project existing = getExisting(id);
		ProjectOrganizationRequest body = RequestValidation.requireRequest(request);
		ProjectStatus status = body.status() == null ? existing.status() : body.status();
		int priority = body.priority() == null ? existing.priority() : body.priority();
		if (priority < 0 || priority > 3) {
			throw new InvalidRequestException("Project priority must be between 0 and 3");
		}
		if (projectRepository.updateOrganization(id, status, priority) == 0) {
			throw notFound(id);
		}
		return getExisting(id);
	}

	/** Every member marks favorites for themselves; it changes nothing for anybody else. */
	@Transactional
	public Project setFavorite(long projectId, boolean favorite) {
		long id = access.require(projectId, Permission.READ).projectId();
		projectRepository.setFavorite(id, favorite);
		return getExisting(id);
	}

	@Transactional
	public Project updateContext(long projectId, ProjectContextRequest request) {
		long id = access.require(projectId, Permission.EDIT_CONTEXT).projectId();
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
		long id = access.require(projectId, Permission.ARCHIVE).projectId();
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
		long id = access.require(projectId, Permission.ARCHIVE).projectId();
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

	@Transactional
	public void delete(long projectId) {
		long id = access.require(projectId, Permission.DELETE).projectId();
		workspaces.lockProject(id);
        if (workspaces.projectHasWorkspaces(id)) {
            throw new com.devhub.backend.exception.ConflictException("Stop and delete this project's workspaces before deleting the project");
        }
        workspaces.purgeDeleted(id);
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

	private List<String> validateRepositories(String primary, List<String> additional) {
		if (additional == null || additional.isEmpty()) return List.of();
		if (primary.isBlank()) throw new InvalidRequestException("Set a primary repository before adding other repositories");
		if (additional.size() > 9) throw new InvalidRequestException("At most ten repositories per project");
		var parser = new RepositoryUrlParser();
		var seen = new java.util.HashSet<String>();
		seen.add(repositoryKey(parser, primary));
		var result = new ArrayList<String>();
		for (String value : additional) {
			String url = RequestValidation.optionalRepositoryUrl(RequestValidation.required(value, "Repository URL"), "Repository URL");
			if (url.length() > 2048) throw new InvalidRequestException("Repository URL must not exceed 2048 characters");
			if (!seen.add(repositoryKey(parser, url))) throw new InvalidRequestException("Each repository can only be linked once");
			result.add(url);
		}
		return List.copyOf(result);
	}

	private String repositoryKey(RepositoryUrlParser parser, String url) {
		var reference = parser.parse(url);
		return reference.provider() == com.devhub.backend.model.RepositoryProvider.GITHUB
				? reference.canonicalUrl().toLowerCase(java.util.Locale.ROOT) : reference.canonicalUrl();
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
