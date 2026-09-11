package com.devhub.backend.controller;

import com.devhub.backend.dto.ContentArchiveRequest;
import com.devhub.backend.dto.ContentAssignmentRequest;
import com.devhub.backend.dto.InboxCaptureRequest;
import com.devhub.backend.model.ContentEntry;
import com.devhub.backend.model.ContentType;
import com.devhub.backend.model.Project;
import com.devhub.backend.service.GlobalContentService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class GlobalContentController {
	private final GlobalContentService service;
	public GlobalContentController(GlobalContentService service) { this.service = service; }
	@GetMapping("/{type:notes|snippets|ideas|todos}") public List<ContentEntry> list(@PathVariable String type, @RequestParam(defaultValue = "all") String scope, @RequestParam(required = false) Long projectId, @RequestParam(required = false) Boolean archived, @RequestParam(required = false) Boolean completed, @RequestParam(required = false) List<String> tags, @RequestParam(required = false) Boolean converted, @RequestParam(defaultValue = "created") String sort, @RequestParam(defaultValue = "100") int limit, @RequestParam(defaultValue = "0") int offset) { return service.findAll(parse(type), scope, projectId, archived, completed, tags, converted, sort, limit, offset); }
	@GetMapping("/{type:notes|snippets|ideas|todos}/{id}") public ContentEntry find(@PathVariable String type, @PathVariable long id) { return service.find(parse(type), id); }
	@GetMapping("/inbox") public List<ContentEntry> inbox(@RequestParam(required = false) ContentType type) { return type == null ? java.util.Arrays.stream(ContentType.values()).flatMap(value -> service.findAll(value, "inbox", null, null, null).stream()).sorted(java.util.Comparator.comparing(ContentEntry::createdAt).reversed()).toList() : service.findAll(type, "inbox", null, null, null); }
	@PostMapping("/inbox") public ResponseEntity<ContentEntry> capture(@RequestBody InboxCaptureRequest request) { ContentEntry entry = service.capture(request); return ResponseEntity.status(201).body(entry); }
	@PatchMapping("/{type:notes|snippets|ideas|todos}/{id}/assignment") public ContentEntry assign(@PathVariable String type, @PathVariable long id, @RequestBody ContentAssignmentRequest request) { return service.assign(parse(type), id, request); }
	@PatchMapping("/{type:notes|snippets|ideas}/{id}/archive") public ContentEntry archive(@PathVariable String type, @PathVariable long id, @RequestBody ContentArchiveRequest request) { return service.archive(parse(type), id, request); }
	@org.springframework.web.bind.annotation.PutMapping("/{type:notes|snippets|ideas|todos}/{id}") public ContentEntry update(@PathVariable String type, @PathVariable long id, @RequestBody InboxCaptureRequest request) { return service.update(parse(type), id, request); }
	@PatchMapping("/todos/{id}/completion") public ContentEntry complete(@PathVariable long id, @RequestBody com.devhub.backend.dto.TodoCompletionRequest request) { return service.setCompleted(id, request.completed()); }
	@PostMapping("/inbox/{type:notes|snippets|ideas|todos}/{id}/promote") public ResponseEntity<Project> promote(@PathVariable String type, @PathVariable long id) { return ResponseEntity.status(201).body(service.promote(parse(type), id)); }
	@DeleteMapping("/{type:notes|snippets|ideas|todos}/{id}") public ResponseEntity<Void> delete(@PathVariable String type, @PathVariable long id) { service.delete(parse(type), id); return ResponseEntity.noContent().build(); }
	private static ContentType parse(String type) { return switch (type) { case "notes" -> ContentType.NOTE; case "snippets" -> ContentType.SNIPPET; case "ideas" -> ContentType.IDEA; case "todos" -> ContentType.TODO; default -> throw new IllegalArgumentException("Unknown content type"); }; }
}
