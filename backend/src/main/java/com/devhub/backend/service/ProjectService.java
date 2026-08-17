package com.devhub.backend.service;

import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.dto.ProjectLinkRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.ProjectLink;
import com.devhub.backend.repository.ProjectRepository;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
public class ProjectService {

	private final ProjectRepository projectRepository;

	public ProjectService(ProjectRepository projectRepository) {
		this.projectRepository = projectRepository;
	}

	@Transactional
	public Project create(ProjectRequest request) {
		ProjectRequest body = RequestValidation.requireRequest(request);
		return projectRepository.create(
				RequestValidation.required(body.name(), "Project name"),
				RequestValidation.optional(body.description()),
				false,
				RequestValidation.optionalUrl(body.repositoryUrl(), "Repository URL"),
				RequestValidation.optionalUrl(body.deploymentUrl(), "Deployment URL"),
				validateLinks(body.links())
		);
	}

	@PostConstruct
	void createSystemSections() {
		if (projectRepository.findSystemProjects().isEmpty()) {
			projectRepository.create(
					"General notes",
					"Notes that are useful across all of your work.",
					true
			);
			projectRepository.create(
					"Future project ideas",
					"Capture ideas worth turning into a project later.",
					true
			);
		}
	}

	public List<Project> findAll() {
		return projectRepository.findAll();
	}

	public Project findById(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		return getExisting(id);
	}

	@Transactional
	public Project update(long projectId, ProjectRequest request) {
		long id = RequestValidation.requireId(projectId, "Project");
		ProjectRequest body = RequestValidation.requireRequest(request);
		if (getExisting(id).system()) {
			throw new InvalidRequestException("System sections cannot be changed");
		}
		if (projectRepository.update(
				id,
				RequestValidation.required(body.name(), "Project name"),
				RequestValidation.optional(body.description()),
				RequestValidation.optionalUrl(body.repositoryUrl(), "Repository URL"),
				RequestValidation.optionalUrl(body.deploymentUrl(), "Deployment URL"),
				validateLinks(body.links())
		) == 0) {
			throw notFound(id);
		}
		return getExisting(id);
	}

	public void delete(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		if (getExisting(id).system()) {
			throw new InvalidRequestException("System sections cannot be deleted");
		}
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
