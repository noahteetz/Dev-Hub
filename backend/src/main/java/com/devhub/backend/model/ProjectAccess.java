package com.devhub.backend.model;

/** The caller's standing in a project: whose data it holds and what the caller may do. */
public record ProjectAccess(long projectId, long ownerId, ProjectRole role) {
}
