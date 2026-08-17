package com.devhub.backend.service;

import com.devhub.backend.model.Tag;
import com.devhub.backend.repository.TagRepository;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class TagService {

	private final TagRepository tagRepository;

	public TagService(TagRepository tagRepository) {
		this.tagRepository = tagRepository;
	}

	public List<Tag> findAll() {
		return tagRepository.findAll();
	}

	List<Tag> resolveNames(List<String> names) {
		if (names == null || names.isEmpty()) {
			return List.of();
		}

		LinkedHashSet<String> distinctNames = new LinkedHashSet<>();
		for (String name : names) {
			distinctNames.add(RequestValidation.required(name, "Tag name").toLowerCase());
		}
		return distinctNames.stream()
				.map(name -> tagRepository.findByName(name).orElseGet(() -> tagRepository.create(name)))
				.toList();
	}

	void deleteOrphans() {
		tagRepository.deleteOrphans();
	}
}