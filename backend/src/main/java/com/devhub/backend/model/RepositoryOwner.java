package com.devhub.backend.model;

/** An account or organization that owns selectable repositories. */
public record RepositoryOwner(String login, String name, RepositoryOwnerType type, int repositoryCount) {
}
