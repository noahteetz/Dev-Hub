package com.devhub.backend.controller;

import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.dto.ProjectArchiveRequest;
import com.devhub.backend.dto.ProjectContextRequest;
import com.devhub.backend.dto.ProjectOrganizationRequest;
import com.devhub.backend.model.Project;
import com.devhub.backend.service.ProjectService;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

	private final ProjectService projectService;

	public ProjectController(ProjectService projectService) {
		this.projectService = projectService;
	}

	@PostMapping
	public ResponseEntity<Project> create(@RequestBody ProjectRequest request) {
		Project project = projectService.create(request);
		return ResponseEntity
				.created(URI.create("/api/projects/" + project.id()))
				.body(project);
	}

	@GetMapping
	public List<Project> findAll(
			@RequestParam(name = "archived", defaultValue = "false") boolean archived
	) {
		return projectService.findAll(archived);
	}

	@GetMapping("/{projectId}")
	public Project findById(@PathVariable("projectId") long projectId) {
		return projectService.findById(projectId);
	}

	@PutMapping("/{projectId}")
	public Project update(
			@PathVariable("projectId") long projectId,
			@RequestBody ProjectRequest request
	) {
		return projectService.update(projectId, request);
	}

	@PatchMapping("/{projectId}/organization")
	public Project updateOrganization(
			@PathVariable("projectId") long projectId,
			@RequestBody ProjectOrganizationRequest request
	) {
		return projectService.updateOrganization(projectId, request);
	}

	@PutMapping("/{projectId}/context")
	public Project updateContext(
			@PathVariable("projectId") long projectId,
			@RequestBody ProjectContextRequest request
	) {
		return projectService.updateContext(projectId, request);
	}

	@PostMapping("/{projectId}/archive")
	public Project archive(
			@PathVariable("projectId") long projectId,
			@RequestBody(required = false) ProjectArchiveRequest request
	) {
		return projectService.archive(projectId, request);
	}

	@PostMapping("/{projectId}/restore")
	public Project restore(@PathVariable("projectId") long projectId) {
		return projectService.restore(projectId);
	}

	@DeleteMapping("/{projectId}")
	public ResponseEntity<Void> delete(@PathVariable("projectId") long projectId) {
		projectService.delete(projectId);
		return ResponseEntity.noContent().build();
	}
}
