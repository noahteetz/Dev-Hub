package com.devhub.backend.service;

import com.devhub.backend.exception.ForbiddenException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Permission;
import com.devhub.backend.model.ProjectAccess;
import com.devhub.backend.repository.ProjectMemberRepository;
import com.devhub.backend.security.CurrentUser;
import org.springframework.stereotype.Service;

/** The one place that decides whether the current user may do something in a project. */
@Service
public class ProjectAccessService {

	private final ProjectMemberRepository members;
	private final CurrentUser currentUser;

	public ProjectAccessService(ProjectMemberRepository members, CurrentUser currentUser) {
		this.members = members;
		this.currentUser = currentUser;
	}

	/** A project the user cannot see is reported as missing, so its existence is not revealed. */
	public ProjectAccess require(long projectId, Permission permission) {
		long id = RequestValidation.requireId(projectId, "Project");
		ProjectAccess access = members.findAccess(id, currentUser.id())
				.orElseThrow(() -> new ResourceNotFoundException("Project " + id + " was not found"));
		if (!access.role().allows(permission)) {
			throw new ForbiddenException("Your role in this project does not allow this action");
		}
		return access;
	}
}
