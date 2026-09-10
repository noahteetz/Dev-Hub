package com.devhub.backend.service;

import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryReference;
import com.devhub.backend.model.RepositorySnapshot;

public interface RepositoryMetadataProvider {
	RepositoryProvider provider();

	RepositorySnapshot fetch(RepositoryReference reference);
}