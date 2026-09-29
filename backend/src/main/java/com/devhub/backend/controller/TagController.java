package com.devhub.backend.controller;

import com.devhub.backend.model.Tag;
import com.devhub.backend.service.TagService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tags")
public class TagController {

	private final TagService tagService;

	public TagController(TagService tagService) {
		this.tagService = tagService;
	}

	@GetMapping
	public List<Tag> findAll(@RequestParam(name = "projectId", required = false) Long projectId) {
		return projectId == null ? tagService.findAll() : tagService.findAllForProject(projectId);
	}
}