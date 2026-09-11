package com.devhub.backend.repository;

import com.devhub.backend.model.SearchCriteria;
import com.devhub.backend.model.SearchResult;
import java.util.List;

/**
 * Portable full text lookup across every content type. The JDBC implementation uses
 * {@code LOWER(...) LIKE} so the same query runs on PostgreSQL and on H2 in tests. A
 * PostgreSQL-only {@code tsvector} implementation can replace it behind this interface.
 */
public interface SearchRepository {

	List<SearchResult> search(SearchCriteria criteria);
}
