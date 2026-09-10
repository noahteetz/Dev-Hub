package com.devhub.backend.controller;

import com.devhub.backend.model.RepositoryConnection;
import com.devhub.backend.service.RepositoryMetadataService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/repository")
public class RepositoryController {

	private final RepositoryMetadataService repositoryMetadataService;

	public RepositoryController(RepositoryMetadataService repositoryMetadataService) {
		this.repositoryMetadataService = repositoryMetadataService;
	}

	@GetMapping
	public RepositoryConnection find(@PathVariable("projectId") long projectId) {
		return repositoryMetadataService.find(projectId);
	}

	@PostMapping("/refresh")
	public RepositoryConnection refresh(@PathVariable("projectId") long projectId) {
		return repositoryMetadataService.refresh(projectId);
	}
}