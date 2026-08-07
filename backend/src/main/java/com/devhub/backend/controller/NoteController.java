package com.devhub.backend.controller;

import com.devhub.backend.dto.NoteRequest;
import com.devhub.backend.model.Note;
import com.devhub.backend.service.NoteService;
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
@RequestMapping("/api/projects/{projectId}/notes")
public class NoteController {

	private final NoteService noteService;

	public NoteController(NoteService noteService) {
		this.noteService = noteService;
	}

	@PostMapping
	public ResponseEntity<Note> create(
			@PathVariable("projectId") long projectId,
			@RequestBody NoteRequest request
	) {
		Note note = noteService.create(projectId, request);
		return ResponseEntity
				.created(URI.create("/api/projects/" + projectId + "/notes/" + note.id()))
				.body(note);
	}

	@GetMapping
	public List<Note> findAll(@PathVariable("projectId") long projectId) {
		return noteService.findAll(projectId);
	}

	@GetMapping("/{noteId}")
	public Note findById(
			@PathVariable("projectId") long projectId,
			@PathVariable("noteId") long noteId
	) {
		return noteService.findById(projectId, noteId);
	}

	@PutMapping("/{noteId}")
	public Note update(
			@PathVariable("projectId") long projectId,
			@PathVariable("noteId") long noteId,
			@RequestBody NoteRequest request
	) {
		return noteService.update(projectId, noteId, request);
	}

	@DeleteMapping("/{noteId}")
	public ResponseEntity<Void> delete(
			@PathVariable("projectId") long projectId,
			@PathVariable("noteId") long noteId
	) {
		noteService.delete(projectId, noteId);
		return ResponseEntity.noContent().build();
	}
}
