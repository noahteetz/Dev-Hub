package com.devhub.backend.model;

import java.util.EnumSet;
import java.util.Set;

/** A user's effective role in one project. Only VIEWER and EDITOR are stored as memberships. */
public enum ProjectRole {
	VIEWER(EnumSet.of(Permission.READ)),
	EDITOR(EnumSet.of(Permission.READ, Permission.WRITE_CONTENT, Permission.EDIT_CONTEXT, Permission.RUN_WORKSPACE)),
	OWNER(EnumSet.allOf(Permission.class));

	private final Set<Permission> permissions;

	ProjectRole(Set<Permission> permissions) {
		this.permissions = permissions;
	}

	public boolean allows(Permission permission) {
		return permissions.contains(permission);
	}

	public boolean isMembership() {
		return this != OWNER;
	}
}
