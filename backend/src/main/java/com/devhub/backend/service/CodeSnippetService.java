package com.devhub.backend.service;

import com.devhub.backend.dto.CodeSnippetRequest;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.CodeSnippet;
import com.devhub.backend.model.Permission;
import com.devhub.backend.model.ProjectAccess;
import com.devhub.backend.repository.CodeSnippetRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CodeSnippetService {

	private final CodeSnippetRepository codeSnippetRepository;
	private final ProjectAccessService access;

	public CodeSnippetService(
			CodeSnippetRepository codeSnippetRepository,
			ProjectAccessService access
	) {
		this.codeSnippetRepository = codeSnippetRepository;
		this.access = access;
	}

	public CodeSnippet create(long projectId, CodeSnippetRequest request) {
		ProjectAccess project = access.require(projectId, Permission.WRITE_CONTENT);
		CodeSnippetRequest body = RequestValidation.requireRequest(request);
		return codeSnippetRepository.create(
				project.ownerId(),
				project.projectId(),
				RequestValidation.required(body.title(), "Code snippet title"),
				RequestValidation.optionalLanguage(body.language()),
				RequestValidation.requiredContent(body.code(), "Code snippet code")
		);
	}

	public List<CodeSnippet> findAll(long projectId) {
		return codeSnippetRepository.findAllByProjectId(access.require(projectId, Permission.READ).projectId());
	}

	public CodeSnippet findById(long projectId, long snippetId) {
		long project = access.require(projectId, Permission.READ).projectId();
		long snippet = RequestValidation.requireId(snippetId, "Code snippet");
		return getExisting(project, snippet);
	}

	public CodeSnippet update(long projectId, long snippetId, CodeSnippetRequest request) {
		long project = access.require(projectId, Permission.WRITE_CONTENT).projectId();
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
		long project = access.require(projectId, Permission.WRITE_CONTENT).projectId();
		long snippet = RequestValidation.requireId(snippetId, "Code snippet");
		if (codeSnippetRepository.delete(project, snippet) == 0) {
			throw notFound(snippet);
		}
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
