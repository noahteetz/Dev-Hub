package com.devhub.backend.dto;

import com.devhub.backend.model.ProjectRole;

public record ProjectMemberRequest(Long userId, ProjectRole role) {
}
