package com.devhub.backend.model;

/** What a member may do in a project. */
public enum Permission {
	READ,
	RUN_WORKSPACE,
	WRITE_CONTENT,
	EDIT_CONTEXT,
	EDIT_METADATA,
	MANAGE_REPOSITORY,
	MANAGE_MEMBERS,
	ARCHIVE,
	DELETE,
	DETACH_CONTENT
}
