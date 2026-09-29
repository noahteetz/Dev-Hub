package com.devhub.backend.service;

import com.devhub.backend.model.Permission;
import com.devhub.backend.model.Tag;
import com.devhub.backend.repository.TagRepository;
import com.devhub.backend.security.CurrentUser;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class TagService {

	private final TagRepository tagRepository;
	private final CurrentUser currentUser;
	private final ProjectAccessService access;

	public TagService(TagRepository tagRepository, CurrentUser currentUser, ProjectAccessService access) {
		this.tagRepository = tagRepository;
		this.currentUser = currentUser;
		this.access = access;
	}

	public List<Tag> findAll() {
		return tagRepository.findAll(currentUser.id());
	}

	/** Entries of a project carry the tags of the project owner, whoever is looking. */
	public List<Tag> findAllForProject(long projectId) {
		return tagRepository.findAll(access.require(projectId, Permission.READ).ownerId());
	}

	List<Tag> resolveNames(long ownerId, List<String> names) {
		if (names == null || names.isEmpty()) {
			return List.of();
		}

		LinkedHashSet<String> distinctNames = new LinkedHashSet<>();
		for (String name : names) {
			distinctNames.add(RequestValidation.required(name, "Tag name").toLowerCase());
		}
		return distinctNames.stream()
				.map(name -> tagRepository.findByName(ownerId, name).orElseGet(() -> tagRepository.create(ownerId, name)))
				.toList();
	}

	void deleteOrphans(long ownerId) {
		tagRepository.deleteOrphans(ownerId);
	}
}