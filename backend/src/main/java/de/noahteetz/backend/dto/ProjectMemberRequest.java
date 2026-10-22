package de.noahteetz.backend.dto;

import de.noahteetz.backend.model.ProjectRole;

public record ProjectMemberRequest(Long userId, ProjectRole role) {
}
