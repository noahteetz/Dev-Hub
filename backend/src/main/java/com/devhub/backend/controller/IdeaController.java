package com.devhub.backend.controller;

import com.devhub.backend.dto.IdeaRequest;
import com.devhub.backend.model.Idea;
import com.devhub.backend.model.Todo;
import com.devhub.backend.service.IdeaService;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/ideas")
public class IdeaController {

	private final IdeaService ideaService;

	public IdeaController(IdeaService ideaService) {
		this.ideaService = ideaService;
	}

	@PostMapping
	public ResponseEntity<Idea> create(@PathVariable("projectId") long projectId, @RequestBody IdeaRequest request) {
		Idea idea = ideaService.create(projectId, request);
		return ResponseEntity.created(URI.create("/api/projects/" + projectId + "/ideas/" + idea.id())).body(idea);
	}

	@GetMapping
	public List<Idea> findAll(@PathVariable("projectId") long projectId) {
		return ideaService.findAll(projectId);
	}

	@GetMapping("/{ideaId}")
	public Idea findById(@PathVariable("projectId") long projectId, @PathVariable("ideaId") long ideaId) {
		return ideaService.findById(projectId, ideaId);
	}

	@PutMapping("/{ideaId}")
	public Idea update(
			@PathVariable("projectId") long projectId,
			@PathVariable("ideaId") long ideaId,
			@RequestBody IdeaRequest request
	) {
		return ideaService.update(projectId, ideaId, request);
	}

	@PostMapping("/{ideaId}/convert")
	public ResponseEntity<Todo> convert(@PathVariable("projectId") long projectId, @PathVariable("ideaId") long ideaId) {
		Todo todo = ideaService.convertToTodo(projectId, ideaId);
		return ResponseEntity.created(URI.create("/api/projects/" + projectId + "/todos/" + todo.id())).body(todo);
	}

	@DeleteMapping("/{ideaId}")
	public ResponseEntity<Void> delete(@PathVariable("projectId") long projectId, @PathVariable("ideaId") long ideaId) {
		ideaService.delete(projectId, ideaId);
		return ResponseEntity.noContent().build();
	}
}