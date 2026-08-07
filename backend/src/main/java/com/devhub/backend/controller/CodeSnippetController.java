package com.devhub.backend.controller;

import com.devhub.backend.dto.CodeSnippetRequest;
import com.devhub.backend.model.CodeSnippet;
import com.devhub.backend.service.CodeSnippetService;
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
@RequestMapping({
		"/api/projects/{projectId}/code-snippets",
		"/api/projects/{projectId}/snippets"
})
public class CodeSnippetController {

	private final CodeSnippetService codeSnippetService;

	public CodeSnippetController(CodeSnippetService codeSnippetService) {
		this.codeSnippetService = codeSnippetService;
	}

	@PostMapping
	public ResponseEntity<CodeSnippet> create(
			@PathVariable("projectId") long projectId,
			@RequestBody CodeSnippetRequest request
	) {
		CodeSnippet snippet = codeSnippetService.create(projectId, request);
		return ResponseEntity
				.created(URI.create("/api/projects/" + projectId + "/code-snippets/" + snippet.id()))
				.body(snippet);
	}

	@GetMapping
	public List<CodeSnippet> findAll(@PathVariable("projectId") long projectId) {
		return codeSnippetService.findAll(projectId);
	}

	@GetMapping("/{snippetId}")
	public CodeSnippet findById(
			@PathVariable("projectId") long projectId,
			@PathVariable("snippetId") long snippetId
	) {
		return codeSnippetService.findById(projectId, snippetId);
	}

	@PutMapping("/{snippetId}")
	public CodeSnippet update(
			@PathVariable("projectId") long projectId,
			@PathVariable("snippetId") long snippetId,
			@RequestBody CodeSnippetRequest request
	) {
		return codeSnippetService.update(projectId, snippetId, request);
	}

	@DeleteMapping("/{snippetId}")
	public ResponseEntity<Void> delete(
			@PathVariable("projectId") long projectId,
			@PathVariable("snippetId") long snippetId
	) {
		codeSnippetService.delete(projectId, snippetId);
		return ResponseEntity.noContent().build();
	}
}
