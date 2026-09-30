package com.devhub.backend.service;

import com.devhub.backend.dto.IdeaRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Idea;
import com.devhub.backend.model.Permission;
import com.devhub.backend.model.ProjectAccess;
import com.devhub.backend.model.Tag;
import com.devhub.backend.model.Todo;
import com.devhub.backend.repository.IdeaRepository;
import com.devhub.backend.repository.TodoRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdeaService {

	private final IdeaRepository ideaRepository;
	private final ProjectAccessService access;
	private final TagService tagService;
	private final TodoRepository todoRepository;

	public IdeaService(
			IdeaRepository ideaRepository,
			ProjectAccessService access,
			TagService tagService,
			TodoRepository todoRepository
	) {
		this.ideaRepository = ideaRepository;
		this.access = access;
		this.tagService = tagService;
		this.todoRepository = todoRepository;
	}

	@Transactional
	public Idea create(long projectId, IdeaRequest request) {
		ProjectAccess project = access.require(projectId, Permission.WRITE_CONTENT);
		IdeaRequest body = RequestValidation.requireRequest(request);
		Idea idea = ideaRepository.create(
				project.ownerId(),
				project.projectId(),
				RequestValidation.required(body.title(), "Idea title"),
				RequestValidation.optional(body.content())
		);
		ideaRepository.replaceTags(idea.id(), tagService.resolveNames(project.ownerId(), body.tags()));
		return enrich(idea);
	}

	public List<Idea> findAll(long projectId) {
		return ideaRepository.findAllByProjectId(access.require(projectId, Permission.READ).projectId()).stream().map(this::enrich).toList();
	}

	public Idea findById(long projectId, long ideaId) {
		return getExisting(access.require(projectId, Permission.READ).projectId(), RequestValidation.requireId(ideaId, "Idea"));
	}

	@Transactional
	public Idea update(long projectId, long ideaId, IdeaRequest request) {
		ProjectAccess projectAccess = access.require(projectId, Permission.WRITE_CONTENT);
		long project = projectAccess.projectId();
		long ideaIdValue = RequestValidation.requireId(ideaId, "Idea");
		IdeaRequest body = RequestValidation.requireRequest(request);
		if (ideaRepository.update(
				project,
				ideaIdValue,
				RequestValidation.required(body.title(), "Idea title"),
				RequestValidation.optional(body.content())
		) == 0) {
			throw notFound(ideaIdValue);
		}
		ideaRepository.replaceTags(ideaIdValue, tagService.resolveNames(projectAccess.ownerId(), body.tags()));
		return getExisting(project, ideaIdValue);
	}

	@Transactional
	public Todo convertToTodo(long projectId, long ideaId) {
		ProjectAccess projectAccess = access.require(projectId, Permission.WRITE_CONTENT);
		long project = projectAccess.projectId();
		Idea idea = getExisting(project, RequestValidation.requireId(ideaId, "Idea"));
		if (idea.converted()) {
			throw new InvalidRequestException("This idea has already been converted to a todo");
		}

		List<Tag> tags = idea.tags();
		Todo todo = todoRepository.create(projectAccess.ownerId(), project, idea.title(), idea.content());
		todoRepository.replaceTags(todo.id(), tags);
		if (ideaRepository.markConverted(project, idea.id(), todo.id()) == 0) {
			throw new InvalidRequestException("This idea has already been converted to a todo");
		}
		return new Todo(
				todo.id(),
				todo.projectId(),
				todo.title(),
				todo.content(),
				todo.completed(),
				todo.completedAt(),
				tags,
				todo.createdAt(),
				todo.updatedAt(),
				todo.createdBy()
		);
	}

	@Transactional
	public void delete(long projectId, long ideaId) {
		ProjectAccess projectAccess = access.require(projectId, Permission.WRITE_CONTENT);
		long idea = RequestValidation.requireId(ideaId, "Idea");
		if (ideaRepository.delete(projectAccess.projectId(), idea) == 0) {
			throw notFound(idea);
		}
		tagService.deleteOrphans(projectAccess.ownerId());
	}

	private Idea getExisting(long projectId, long ideaId) {
		return ideaRepository.findById(projectId, ideaId)
				.map(this::enrich)
				.orElseThrow(() -> notFound(ideaId));
	}

	private Idea enrich(Idea idea) {
		return new Idea(
				idea.id(),
				idea.projectId(),
				idea.title(),
				idea.content(),
				idea.converted(),
				idea.convertedTodoId(),
				ideaRepository.findTagsByIdeaId(idea.id()),
				idea.createdAt(),
				idea.updatedAt(),
				idea.createdBy()
		);
	}

	private ResourceNotFoundException notFound(long ideaId) {
		return new ResourceNotFoundException("Idea " + ideaId + " was not found in this project");
	}
}