package com.devhub.backend.service;

import com.devhub.backend.dto.NoteRequest;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Note;
import com.devhub.backend.repository.NoteRepository;
import com.devhub.backend.repository.ProjectRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class NoteService {

	private final NoteRepository noteRepository;
	private final ProjectRepository projectRepository;

	public NoteService(NoteRepository noteRepository, ProjectRepository projectRepository) {
		this.noteRepository = noteRepository;
		this.projectRepository = projectRepository;
	}

	public Note create(long projectId, NoteRequest request) {
		long project = requireProject(projectId);
		NoteRequest body = RequestValidation.requireRequest(request);
		return noteRepository.create(
				project,
				RequestValidation.required(body.title(), "Note title"),
				RequestValidation.requiredContent(body.content(), "Note content")
		);
	}

	public List<Note> findAll(long projectId) {
		return noteRepository.findAllByProjectId(requireProject(projectId));
	}

	public Note findById(long projectId, long noteId) {
		long project = requireProject(projectId);
		long note = RequestValidation.requireId(noteId, "Note");
		return getExisting(project, note);
	}

	public Note update(long projectId, long noteId, NoteRequest request) {
		long project = requireProject(projectId);
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
		long project = requireProject(projectId);
		long note = RequestValidation.requireId(noteId, "Note");
		if (noteRepository.delete(project, note) == 0) {
			throw notFound(note);
		}
	}

	private long requireProject(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		if (projectRepository.findById(id).isEmpty()) {
			throw new ResourceNotFoundException("Project " + id + " was not found");
		}
		return id;
	}

	private Note getExisting(long projectId, long noteId) {
		return noteRepository.findById(projectId, noteId)
				.orElseThrow(() -> notFound(noteId));
	}

	private ResourceNotFoundException notFound(long noteId) {
		return new ResourceNotFoundException("Note " + noteId + " was not found in this project");
	}
}
