package de.noahteetz.backend.dto;

import de.noahteetz.backend.model.RepositoryProvider;
import java.util.List;

/** Turns a selection from the repository picker into projects. */
public record RepositoryImportRequest(RepositoryProvider provider, List<String> fullNames) {
}
