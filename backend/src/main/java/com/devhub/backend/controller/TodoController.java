package com.devhub.backend.controller;

import com.devhub.backend.dto.TodoCompletionRequest;
import com.devhub.backend.dto.TodoRequest;
import com.devhub.backend.model.Todo;
import com.devhub.backend.service.TodoService;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/todos")
public class TodoController {

	private final TodoService todoService;

	public TodoController(TodoService todoService) {
		this.todoService = todoService;
	}

	@PostMapping
	public ResponseEntity<Todo> create(@PathVariable("projectId") long projectId, @RequestBody TodoRequest request) {
		Todo todo = todoService.create(projectId, request);
		return ResponseEntity.created(URI.create("/api/projects/" + projectId + "/todos/" + todo.id())).body(todo);
	}

	@GetMapping
	public List<Todo> findAll(@PathVariable("projectId") long projectId) {
		return todoService.findAll(projectId);
	}

	@GetMapping("/{todoId}")
	public Todo findById(@PathVariable("projectId") long projectId, @PathVariable("todoId") long todoId) {
		return todoService.findById(projectId, todoId);
	}

	@PutMapping("/{todoId}")
	public Todo update(
			@PathVariable("projectId") long projectId,
			@PathVariable("todoId") long todoId,
			@RequestBody TodoRequest request
	) {
		return todoService.update(projectId, todoId, request);
	}

	@PatchMapping("/{todoId}/completion")
	public Todo setCompleted(
			@PathVariable("projectId") long projectId,
			@PathVariable("todoId") long todoId,
			@RequestBody TodoCompletionRequest request
	) {
		return todoService.setCompleted(projectId, todoId, request.completed());
	}

	@DeleteMapping("/{todoId}")
	public ResponseEntity<Void> delete(@PathVariable("projectId") long projectId, @PathVariable("todoId") long todoId) {
		todoService.delete(projectId, todoId);
		return ResponseEntity.noContent().build();
	}
}