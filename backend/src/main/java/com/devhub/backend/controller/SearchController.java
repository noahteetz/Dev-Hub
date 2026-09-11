package com.devhub.backend.controller;

import com.devhub.backend.model.SearchResult;
import com.devhub.backend.service.SearchService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {

	private final SearchService service;

	public SearchController(SearchService service) {
		this.service = service;
	}

	@GetMapping
	public List<SearchResult> search(
			@RequestParam(required = false) String q,
			@RequestParam(required = false) List<String> types,
			@RequestParam(required = false) Long projectId,
			@RequestParam(required = false) List<String> tags,
			@RequestParam(defaultValue = "false") boolean includeArchived,
			@RequestParam(defaultValue = "false") boolean includeCompleted,
			@RequestParam(defaultValue = "20") int limit,
			@RequestParam(defaultValue = "0") int offset) {
		return service.search(q, types, projectId, tags, includeArchived, includeCompleted, limit, offset);
	}
}
