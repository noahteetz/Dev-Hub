package com.devhub.backend.service;

import com.devhub.backend.dto.CodeSnippetRequest;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.CodeSnippet;
import com.devhub.backend.repository.CodeSnippetRepository;
import com.devhub.backend.repository.ProjectRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CodeSnippetService {

	private final CodeSnippetRepository codeSnippetRepository;
	private final ProjectRepository projectRepository;

	public CodeSnippetService(
			CodeSnippetRepository codeSnippetRepository,
			ProjectRepository projectRepository
	) {
		this.codeSnippetRepository = codeSnippetRepository;
		this.projectRepository = projectRepository;
	}

	public CodeSnippet create(long projectId, CodeSnippetRequest request) {
		long project = requireProject(projectId);
		CodeSnippetRequest body = RequestValidation.requireRequest(request);
		return codeSnippetRepository.create(
				project,
				RequestValidation.required(body.title(), "Code snippet title"),
				RequestValidation.optionalLanguage(body.language()),
				RequestValidation.requiredContent(body.code(), "Code snippet code")
		);
	}

	public List<CodeSnippet> findAll(long projectId) {
		return codeSnippetRepository.findAllByProjectId(requireProject(projectId));
	}

	public CodeSnippet findById(long projectId, long snippetId) {
		long project = requireProject(projectId);
		long snippet = RequestValidation.requireId(snippetId, "Code snippet");
		return getExisting(project, snippet);
	}

	public CodeSnippet update(long projectId, long snippetId, CodeSnippetRequest request) {
		long project = requireProject(projectId);
		long snippet = RequestValidation.requireId(snippetId, "Code snippet");
		CodeSnippetRequest body = RequestValidation.requireRequest(request);
		if (codeSnippetRepository.update(
				project,
				snippet,
				RequestValidation.required(body.title(), "Code snippet title"),
				RequestValidation.optionalLanguage(body.language()),
				RequestValidation.requiredContent(body.code(), "Code snippet code")
		) == 0) {
			throw notFound(snippet);
		}
		return getExisting(project, snippet);
	}

	public void delete(long projectId, long snippetId) {
		long project = requireProject(projectId);
		long snippet = RequestValidation.requireId(snippetId, "Code snippet");
		if (codeSnippetRepository.delete(project, snippet) == 0) {
			throw notFound(snippet);
		}
	}

	private long requireProject(long projectId) {
		long id = RequestValidation.requireId(projectId, "Project");
		if (projectRepository.findById(id).isEmpty()) {
			throw new ResourceNotFoundException("Project " + id + " was not found");
		}
		return id;
	}

	private CodeSnippet getExisting(long projectId, long snippetId) {
		return codeSnippetRepository.findById(projectId, snippetId)
				.orElseThrow(() -> notFound(snippetId));
	}

	private ResourceNotFoundException notFound(long snippetId) {
		return new ResourceNotFoundException(
				"Code snippet " + snippetId + " was not found in this project"
		);
	}
}
