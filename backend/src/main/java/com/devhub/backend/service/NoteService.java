package com.devhub.backend.service;

import com.devhub.backend.dto.NoteRequest;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Note;
import com.devhub.backend.model.Permission;
import com.devhub.backend.model.ProjectAccess;
import com.devhub.backend.repository.NoteRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class NoteService {

	private final NoteRepository noteRepository;
	private final ProjectAccessService access;

	public NoteService(NoteRepository noteRepository, ProjectAccessService access) {
		this.noteRepository = noteRepository;
		this.access = access;
	}

	public Note create(long projectId, NoteRequest request) {
		ProjectAccess project = access.require(projectId, Permission.WRITE_CONTENT);
		NoteRequest body = RequestValidation.requireRequest(request);
		return noteRepository.create(
				project.ownerId(),
				project.projectId(),
				RequestValidation.required(body.title(), "Note title"),
				RequestValidation.requiredContent(body.content(), "Note content")
		);
	}

	public List<Note> findAll(long projectId) {
		return noteRepository.findAllByProjectId(access.require(projectId, Permission.READ).projectId());
	}

	public Note findById(long projectId, long noteId) {
		long project = access.require(projectId, Permission.READ).projectId();
		long note = RequestValidation.requireId(noteId, "Note");
		return getExisting(project, note);
	}

	public Note update(long projectId, long noteId, NoteRequest request) {
		long project = access.require(projectId, Permission.WRITE_CONTENT).projectId();
		long note = RequestValidation.requireId(noteId, "Note");
		NoteRequest body = RequestValidation.requireRequest(request);
		if (noteRepository.update(
				project,
				note,
				RequestValidation.required(body.title(), "Note title"),
				RequestValidation.requiredContent(body.content(), "Note content")
		) == 0) {
			throw notFound(note);
		}
		return getExisting(project, note);
	}

	public void delete(long projectId, long noteId) {
		long project = access.require(projectId, Permission.WRITE_CONTENT).projectId();
		long note = RequestValidation.requireId(noteId, "Note");
		if (noteRepository.delete(project, note) == 0) {
			throw notFound(note);
		}
	}

	private Note getExisting(long projectId, long noteId) {
		return noteRepository.findById(projectId, noteId)
				.orElseThrow(() -> notFound(noteId));
	}

	private ResourceNotFoundException notFound(long noteId) {
		return new ResourceNotFoundException("Note " + noteId + " was not found in this project");
	}
}
