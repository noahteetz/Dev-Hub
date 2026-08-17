package com.devhub.backend.service;

import com.devhub.backend.dto.IdeaRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Idea;
import com.devhub.backend.model.Tag;
import com.devhub.backend.model.Todo;
import com.devhub.backend.repository.IdeaRepository;
import com.devhub.backend.repository.ProjectRepository;
import com.devhub.backend.repository.TodoRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdeaService {

	private final IdeaRepository ideaRepository;
	private final ProjectRepository projectRepository;
	private final TagService tagService;
	private final TodoRepository todoRepository;

	public IdeaService(
			IdeaRepository ideaRepository,
			ProjectRepository projectRepository,
			TagService tagService,
			TodoRepository todoRepository
	) {
		this.ideaRepository = ideaRepository;
		this.projectRepository = projectRepository;
		this.tagService = tagService;
		this.todoRepository = todoRepository;
	}

	@Transactional
	public Idea create(long projectId, IdeaRequest request) {
		long project = requireProject(projectId);
		IdeaRequest body = RequestValidation.requireRequest(request);
		Idea idea = ideaRepository.create(
				project,
				RequestValidation.required(body.title(), "Idea title"),
				RequestValidation.optional(body.content())
		);
		ideaRepository.replaceTags(idea.id(), tagService.resolveNames(body.tags()));
		return enrich(idea);
	}

	public List<Idea> findAll(long projectId) {
		return ideaRepository.findAllByProjectId(requireProject(projectId)).stream().map(this::enrich).toList();
	}

	public Idea findById(long projectId, long ideaId) {
		return getExisting(requireProject(projectId), RequestValidation.requireId(ideaId, "Idea"));
	}

	@Transactional
	public Idea update(long projectId, long ideaId, IdeaRequest request) {
		long project = requireProject(projectId);
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
		ideaRepository.replaceTags(ideaIdValue, tagService.resolveNames(body.tags()));
		return getExisting(project, ideaIdValue);
	}

	@Transactional
	public Todo convertToTodo(long projectId, long ideaId) {
		long project = requireProject(projectId);
		Idea idea = getExisting(project, RequestValidation.requireId(ideaId, "Idea"));
		if (idea.converted()) {
			throw new InvalidRequestException("This idea has already been converted to a todo");
		}

		List<Tag> tags = idea.tags();
		Todo todo = todoRepository.create(project, idea.title(), idea.content());
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
				todo.updatedAt()
		);
	}

	@Transactional
	public void delete(long projectId, long ideaId) {
		long project = requireProject(projectId);
		long idea = RequestValidation.requireId(ideaId, "Idea");
		if (ideaRepository.delete(project, idea) == 0) {
			throw notFound(idea);
		}
		tagService.deleteOrphans();
	}

	private long requireProject(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		if (projectRepository.findById(id).isEmpty()) {
			throw new ResourceNotFoundException("Project " + id + " was not found");
		}
		return id;
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
				idea.updatedAt()
		);
	}

	private ResourceNotFoundException notFound(long ideaId) {
		return new ResourceNotFoundException("Idea " + ideaId + " was not found in this project");
	}
}