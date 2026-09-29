package com.devhub.backend.controller;

import com.devhub.backend.dto.ProjectMemberRequest;
import com.devhub.backend.dto.ProjectMemberRoleRequest;
import com.devhub.backend.model.ProjectMember;
import com.devhub.backend.service.ProjectMemberService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
public class ProjectMemberController {

	private final ProjectMemberService service;

	public ProjectMemberController(ProjectMemberService service) {
		this.service = service;
	}

	@GetMapping
	public List<ProjectMember> findAll(@PathVariable("projectId") long projectId) {
		return service.findAll(projectId);
	}

	@PostMapping
	public ResponseEntity<ProjectMember> add(
			@PathVariable("projectId") long projectId,
			@RequestBody ProjectMemberRequest request
	) {
		return ResponseEntity.status(201).body(service.add(projectId, request));
	}

	@PatchMapping("/{userId}")
	public ProjectMember changeRole(
			@PathVariable("projectId") long projectId,
			@PathVariable("userId") long userId,
			@RequestBody ProjectMemberRoleRequest request
	) {
		return service.changeRole(projectId, userId, request);
	}

	@DeleteMapping("/me")
	public ResponseEntity<Void> leave(@PathVariable("projectId") long projectId) {
		service.leave(projectId);
		return ResponseEntity.noContent().build();
	}

	@DeleteMapping("/{userId}")
	public ResponseEntity<Void> remove(@PathVariable("projectId") long projectId, @PathVariable("userId") long userId) {
		service.remove(projectId, userId);
		return ResponseEntity.noContent().build();
	}
}
