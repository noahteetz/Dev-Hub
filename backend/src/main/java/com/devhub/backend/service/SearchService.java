package com.devhub.backend.service;

import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.EntityType;
import com.devhub.backend.model.SearchCriteria;
import com.devhub.backend.model.SearchResult;
import com.devhub.backend.repository.SearchRepository;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class SearchService {

	static final int MINIMUM_TERM_LENGTH = 2;

	private final SearchRepository repository;

	public SearchService(SearchRepository repository) {
		this.repository = repository;
	}

	public List<SearchResult> search(String term, List<String> types, Long projectId, List<String> tags,
			boolean includeArchived, boolean includeCompleted, int limit, int offset) {
		String searchTerm = term == null ? "" : term.trim();
		if (searchTerm.length() < MINIMUM_TERM_LENGTH) {
			throw new InvalidRequestException("Search term must have at least " + MINIMUM_TERM_LENGTH + " characters");
		}
		if (limit < 1 || limit > 100) {
			throw new InvalidRequestException("Limit must be between 1 and 100");
		}
		if (offset < 0) {
			throw new InvalidRequestException("Offset must not be negative");
		}

		SearchCriteria criteria = new SearchCriteria(searchTerm, parseTypes(types), projectId, splitValues(tags),
				includeArchived, includeCompleted, limit, offset);

		// Title hits rank above content hits, recently updated entries above older ones.
		return repository.search(criteria).stream()
				.sorted(Comparator.comparing((SearchResult hit) -> hit.titleMatch()).reversed()
						.thenComparing(Comparator.comparing((SearchResult hit) -> hit.updatedAt()).reversed())
						.thenComparing(SearchResult::id))
				.skip(offset)
				.limit(limit)
				.toList();
	}

	private static Set<EntityType> parseTypes(List<String> types) {
		List<String> requested = splitValues(types);
		if (requested.isEmpty()) {
			return Set.of(EntityType.values());
		}

		Set<EntityType> parsed = new LinkedHashSet<>();
		for (String value : requested) {
			parsed.add(Arrays.stream(EntityType.values())
					.filter(candidate -> candidate.name().equalsIgnoreCase(value))
					.findFirst()
					.orElseThrow(() -> new InvalidRequestException("Unknown content type " + value)));
		}
		return parsed;
	}

	private static List<String> splitValues(List<String> values) {
		return values == null ? List.of() : values.stream()
				.flatMap(value -> Arrays.stream(value.split(",")))
				.map(String::trim)
				.filter(value -> !value.isBlank())
				.toList();
	}
}
