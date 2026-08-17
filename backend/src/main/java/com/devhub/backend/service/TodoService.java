package com.devhub.backend.service;

import com.devhub.backend.dto.TodoRequest;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Todo;
import com.devhub.backend.repository.ProjectRepository;
import com.devhub.backend.repository.TodoRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TodoService {

	private final ProjectRepository projectRepository;
	private final TagService tagService;
	private final TodoRepository todoRepository;

	public TodoService(
			ProjectRepository projectRepository,
			TagService tagService,
			TodoRepository todoRepository
	) {
		this.projectRepository = projectRepository;
		this.tagService = tagService;
		this.todoRepository = todoRepository;
	}

	@Transactional
	public Todo create(long projectId, TodoRequest request) {
		long project = requireProject(projectId);
		TodoRequest body = RequestValidation.requireRequest(request);
		Todo todo = todoRepository.create(
				project,
				RequestValidation.required(body.title(), "Todo title"),
				RequestValidation.optional(body.content())
		);
		todoRepository.replaceTags(todo.id(), tagService.resolveNames(body.tags()));
		return enrich(todo);
	}

	public List<Todo> findAll(long projectId) {
		return todoRepository.findAllByProjectId(requireProject(projectId)).stream().map(this::enrich).toList();
	}

	public Todo findById(long projectId, long todoId) {
		return getExisting(requireProject(projectId), RequestValidation.requireId(todoId, "Todo"));
	}

	@Transactional
	public Todo update(long projectId, long todoId, TodoRequest request) {
		long project = requireProject(projectId);
		long todoIdValue = RequestValidation.requireId(todoId, "Todo");
		TodoRequest body = RequestValidation.requireRequest(request);
		if (todoRepository.update(
				project,
				todoIdValue,
				RequestValidation.required(body.title(), "Todo title"),
				RequestValidation.optional(body.content())
		) == 0) {
			throw notFound(todoIdValue);
		}
		todoRepository.replaceTags(todoIdValue, tagService.resolveNames(body.tags()));
		return getExisting(project, todoIdValue);
	}

	public Todo setCompleted(long projectId, long todoId, boolean completed) {
		long project = requireProject(projectId);
		long todo = RequestValidation.requireId(todoId, "Todo");
		if (todoRepository.setCompleted(project, todo, completed) == 0) {
			throw notFound(todo);
		}
		return getExisting(project, todo);
	}

	@Transactional
	public void delete(long projectId, long todoId) {
		long project = requireProject(projectId);
		long todo = RequestValidation.requireId(todoId, "Todo");
		if (todoRepository.delete(project, todo) == 0) {
			throw notFound(todo);
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

	private Todo getExisting(long projectId, long todoId) {
		return todoRepository.findById(projectId, todoId)
				.map(this::enrich)
				.orElseThrow(() -> notFound(todoId));
	}

	private Todo enrich(Todo todo) {
		return new Todo(
				todo.id(),
				todo.projectId(),
				todo.title(),
				todo.content(),
				todo.completed(),
				todo.completedAt(),
				todoRepository.findTagsByTodoId(todo.id()),
				todo.createdAt(),
				todo.updatedAt()
		);
	}

	private ResourceNotFoundException notFound(long todoId) {
		return new ResourceNotFoundException("Todo " + todoId + " was not found in this project");
	}
}