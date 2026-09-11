package com.devhub.backend.dto;

import com.devhub.backend.model.RepositoryProvider;
import java.util.List;

/** Turns a selection from the repository picker into projects. */
public record RepositoryImportRequest(RepositoryProvider provider, List<String> fullNames) {
}
