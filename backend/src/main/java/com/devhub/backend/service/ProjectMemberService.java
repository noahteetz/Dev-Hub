package com.devhub.backend.service;

import com.devhub.backend.dto.ProjectMemberRequest;
import com.devhub.backend.dto.ProjectMemberRoleRequest;
import com.devhub.backend.exception.ConflictException;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.Permission;
import com.devhub.backend.model.ProjectAccess;
import com.devhub.backend.model.ProjectMember;
import com.devhub.backend.model.ProjectRole;
import com.devhub.backend.model.UserSummary;
import com.devhub.backend.repository.AppUserRepository;
import com.devhub.backend.repository.ProjectMemberRepository;
import com.devhub.backend.security.CurrentUser;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectMemberService {

	private final ProjectMemberRepository members;
	private final AppUserRepository users;
	private final ProjectAccessService access;
	private final CurrentUser currentUser;

	public ProjectMemberService(
			ProjectMemberRepository members,
			AppUserRepository users,
			ProjectAccessService access,
			CurrentUser currentUser
	) {
		this.members = members;
		this.users = users;
		this.access = access;
		this.currentUser = currentUser;
	}

	/** The owner first, then the members in the order they were added. */
	public List<ProjectMember> findAll(long projectId) {
		return list(access.require(projectId, Permission.READ));
	}

	@Transactional
	public ProjectMember add(long projectId, ProjectMemberRequest request) {
		ProjectAccess project = access.require(projectId, Permission.MANAGE_MEMBERS);
		ProjectMemberRequest body = RequestValidation.requireRequest(request);
		if (body.userId() == null) {
			throw new InvalidRequestException("User is required");
		}
		ProjectRole role = requireMembershipRole(body.role());
		if (body.userId() == project.ownerId()) {
			throw new InvalidRequestException("The owner is already part of the project");
		}
		UserSummary user = users.findById(body.userId())
				.orElseThrow(() -> new ResourceNotFoundException("User " + body.userId() + " was not found"));
		if (members.exists(project.projectId(), user.id())) {
			throw new ConflictException(user.displayName() + " is already a member of this project");
		}
		members.add(project.projectId(), user.id(), role, currentUser.id());
		return find(project, user.id());
	}

	@Transactional
	public ProjectMember changeRole(long projectId, long userId, ProjectMemberRoleRequest request) {
		ProjectAccess project = access.require(projectId, Permission.MANAGE_MEMBERS);
		ProjectRole role = requireMembershipRole(RequestValidation.requireRequest(request).role());
		if (members.updateRole(project.projectId(), userId, role) == 0) {
			throw notMember(userId);
		}
		return find(project, userId);
	}

	@Transactional
	public void remove(long projectId, long userId) {
		ProjectAccess project = access.require(projectId, Permission.MANAGE_MEMBERS);
		if (members.remove(project.projectId(), userId) == 0) {
			throw notMember(userId);
		}
	}

	@Transactional
	public void leave(long projectId) {
		ProjectAccess project = access.require(projectId, Permission.READ);
		if (project.role() == ProjectRole.OWNER) {
			throw new InvalidRequestException("The owner cannot leave the project");
		}
		members.remove(project.projectId(), currentUser.id());
	}

	private List<ProjectMember> list(ProjectAccess project) {
		List<ProjectMember> all = new ArrayList<>();
		users.findById(project.ownerId()).ifPresent(owner ->
				all.add(new ProjectMember(owner.id(), owner.username(), owner.displayName(), ProjectRole.OWNER, null)));
		all.addAll(members.findMembers(project.projectId()));
		return all;
	}

	private ProjectMember find(ProjectAccess project, long userId) {
		return list(project).stream()
				.filter(member -> member.userId() == userId)
				.findFirst()
				.orElseThrow(() -> notMember(userId));
	}

	private static ProjectRole requireMembershipRole(ProjectRole role) {
		if (role == null || !role.isMembership()) {
			throw new InvalidRequestException("Role must be VIEWER or EDITOR");
		}
		return role;
	}

	private static ResourceNotFoundException notMember(long userId) {
		return new ResourceNotFoundException("User " + userId + " is not a member of this project");
	}
}
