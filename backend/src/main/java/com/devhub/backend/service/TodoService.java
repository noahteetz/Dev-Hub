package com.devhub.backend.service;

import com.devhub.backend.dto.TodoRequest;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Permission;
import com.devhub.backend.model.ProjectAccess;
import com.devhub.backend.model.Todo;
import com.devhub.backend.repository.TodoRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TodoService {

	private final ProjectAccessService access;
	private final TagService tagService;
	private final TodoRepository todoRepository;

	public TodoService(
			ProjectAccessService access,
			TagService tagService,
			TodoRepository todoRepository
	) {
		this.access = access;
		this.tagService = tagService;
		this.todoRepository = todoRepository;
	}

	@Transactional
	public Todo create(long projectId, TodoRequest request) {
		ProjectAccess project = access.require(projectId, Permission.WRITE_CONTENT);
		TodoRequest body = RequestValidation.requireRequest(request);
		Todo todo = todoRepository.create(
				project.ownerId(),
				project.projectId(),
				RequestValidation.required(body.title(), "Todo title"),
				RequestValidation.optional(body.content())
		);
		todoRepository.replaceTags(todo.id(), tagService.resolveNames(project.ownerId(), body.tags()));
		return enrich(todo);
	}

	public List<Todo> findAll(long projectId) {
		return todoRepository.findAllByProjectId(access.require(projectId, Permission.READ).projectId()).stream().map(this::enrich).toList();
	}

	public Todo findById(long projectId, long todoId) {
		return getExisting(access.require(projectId, Permission.READ).projectId(), RequestValidation.requireId(todoId, "Todo"));
	}

	@Transactional
	public Todo update(long projectId, long todoId, TodoRequest request) {
		ProjectAccess projectAccess = access.require(projectId, Permission.WRITE_CONTENT);
		long project = projectAccess.projectId();
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
		todoRepository.replaceTags(todoIdValue, tagService.resolveNames(projectAccess.ownerId(), body.tags()));
		return getExisting(project, todoIdValue);
	}

	public Todo setCompleted(long projectId, long todoId, boolean completed) {
		long project = access.require(projectId, Permission.WRITE_CONTENT).projectId();
		long todo = RequestValidation.requireId(todoId, "Todo");
		if (todoRepository.setCompleted(project, todo, completed) == 0) {
			throw notFound(todo);
		}
		return getExisting(project, todo);
	}

	@Transactional
	public void delete(long projectId, long todoId) {
		ProjectAccess projectAccess = access.require(projectId, Permission.WRITE_CONTENT);
		long todo = RequestValidation.requireId(todoId, "Todo");
		if (todoRepository.delete(projectAccess.projectId(), todo) == 0) {
			throw notFound(todo);
		}
		tagService.deleteOrphans(projectAccess.ownerId());
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
				todo.updatedAt(),
				todo.createdBy()
		);
	}

	private ResourceNotFoundException notFound(long todoId) {
		return new ResourceNotFoundException("Todo " + todoId + " was not found in this project");
	}
}