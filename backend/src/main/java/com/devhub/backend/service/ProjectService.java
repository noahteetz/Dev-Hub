package com.devhub.backend.service;

import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Project;
import com.devhub.backend.repository.ProjectRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ProjectService {

	private final ProjectRepository projectRepository;

	public ProjectService(ProjectRepository projectRepository) {
		this.projectRepository = projectRepository;
	}

	public Project create(ProjectRequest request) {
		ProjectRequest body = RequestValidation.requireRequest(request);
		return projectRepository.create(
				RequestValidation.required(body.name(), "Project name"),
				RequestValidation.optional(body.description())
		);
	}

	public List<Project> findAll() {
		return projectRepository.findAll();
	}

	public Project findById(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		return getExisting(id);
	}

	public Project update(long projectId, ProjectRequest request) {
		long id = RequestValidation.requireId(projectId, "Project");
		ProjectRequest body = RequestValidation.requireRequest(request);
		if (projectRepository.update(
				id,
				RequestValidation.required(body.name(), "Project name"),
				RequestValidation.optional(body.description())
		) == 0) {
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
}
