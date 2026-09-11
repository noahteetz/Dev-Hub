package com.devhub.backend.controller;

import com.devhub.backend.dto.EntityReferenceRequest;
import com.devhub.backend.model.EntityReference;
import com.devhub.backend.model.EntityType;
import com.devhub.backend.service.EntityReferenceService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/references")
public class EntityReferenceController {

	private final EntityReferenceService service;

	public EntityReferenceController(EntityReferenceService service) {
		this.service = service;
	}

	@GetMapping
	public ReferenceGroup list(@RequestParam EntityType type, @RequestParam long id) {
		return new ReferenceGroup(service.outgoing(type, id), service.incoming(type, id));
	}

	@PostMapping
	public ResponseEntity<EntityReference> create(@RequestBody EntityReferenceRequest request) {
		return ResponseEntity.status(201).body(service.create(request));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable long id) {
		service.delete(id);
		return ResponseEntity.noContent().build();
	}

	public record ReferenceGroup(List<EntityReference> outgoing, List<EntityReference> incoming) {
	}
}
