package com.devhub.backend.repository;

import com.devhub.backend.model.EntityType;
import com.devhub.backend.model.SearchCriteria;
import com.devhub.backend.model.SearchResult;
import com.devhub.backend.model.Tag;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcSearchRepository implements SearchRepository {

	private final JdbcTemplate jdbc;

	public JdbcSearchRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public List<SearchResult> search(SearchCriteria criteria) {
		List<SearchResult> results = new ArrayList<>();
		for (EntityType type : EntityType.values()) {
			if (criteria.types().contains(type)) {
				results.addAll(searchType(type, criteria));
			}
		}
		return results;
	}

	private List<SearchResult> searchType(EntityType type, SearchCriteria criteria) {
		Source source = Source.of(type);
		if (source.tagJoin() == null && !criteria.tags().isEmpty()) {
			return List.of();
		}

		String pattern = "%" + criteria.term().toLowerCase() + "%";
		List<Object> args = new ArrayList<>();
		StringBuilder sql = new StringBuilder("SELECT s.id AS id, ")
				.append(source.titleColumn()).append(" AS title, ")
				.append(source.contentExpression()).append(" AS content, ")
				.append(source.projectIdExpression()).append(" AS project_id, ")
				.append(source.projectNameExpression()).append(" AS project_name, ")
				.append(source.archivedExpression()).append(" AS archived, ")
				.append(source.completedExpression()).append(" AS completed, ")
				.append("s.created_at AS created_at, s.updated_at AS updated_at FROM ")
				.append(source.table()).append(" s ")
				.append(source.projectJoin())
				.append(" WHERE (LOWER(").append(source.titleColumn()).append(") LIKE ? OR LOWER(")
				.append(source.contentExpression()).append(") LIKE ?)");
		args.add(pattern);
		args.add(pattern);

		if (!criteria.includeArchived()) {
			sql.append(" AND ").append(source.archivedExpression()).append(" = FALSE");
		}
		if (!criteria.includeCompleted()) {
			sql.append(" AND ").append(source.completedExpression()).append(" = FALSE");
		}
		if (criteria.projectId() != null) {
			sql.append(" AND ").append(source.projectIdExpression()).append(" = ?");
			args.add(criteria.projectId());
		}
		for (String tag : criteria.tags()) {
			sql.append(" AND EXISTS (SELECT 1 FROM ").append(source.tagJoin())
					.append(" jt JOIN tags t ON t.id = jt.tag_id WHERE jt.")
					.append(source.tagIdColumn()).append(" = s.id AND LOWER(t.name) = ?)");
			args.add(tag.toLowerCase());
		}

		sql.append(" ORDER BY CASE WHEN LOWER(").append(source.titleColumn())
				.append(") LIKE ? THEN 0 ELSE 1 END, s.updated_at DESC, s.id DESC LIMIT ?");
		args.add(pattern);
		args.add(criteria.limit() + criteria.offset());

		List<SearchResult> hits = jdbc.query(sql.toString(), (rs, row) -> map(type, criteria.term(), rs), args.toArray());
		return withTags(source, hits);
	}

	private SearchResult map(EntityType type, String term, ResultSet rs) throws SQLException {
		long id = rs.getLong("id");
		String title = rs.getString("title");
		String content = rs.getString("content");
		boolean titleMatch = title != null && title.toLowerCase().contains(term.toLowerCase());
		return new SearchResult(
				type,
				id,
				title,
				nullableLong(rs, "project_id"),
				rs.getString("project_name"),
				SearchExcerpt.around(content, term),
				List.of(),
				titleMatch,
				rs.getBoolean("archived"),
				rs.getBoolean("completed"),
				type.permalink(id),
				instant(rs, "created_at"),
				instant(rs, "updated_at"));
	}

	private List<SearchResult> withTags(Source source, List<SearchResult> hits) {
		if (source.tagJoin() == null || hits.isEmpty()) {
			return hits;
		}

		String placeholders = String.join(", ", hits.stream().map(hit -> "?").toList());
		Map<Long, List<Tag>> byEntry = new HashMap<>();
		jdbc.query("SELECT jt." + source.tagIdColumn() + " AS entry_id, t.id, t.name FROM " + source.tagJoin()
						+ " jt JOIN tags t ON t.id = jt.tag_id WHERE jt." + source.tagIdColumn()
						+ " IN (" + placeholders + ") ORDER BY t.name",
				(rs, row) -> Map.entry(rs.getLong("entry_id"), new Tag(rs.getLong("id"), rs.getString("name"))),
				hits.stream().map(SearchResult::id).toArray())
				.forEach(entry -> byEntry.computeIfAbsent(entry.getKey(), key -> new ArrayList<>()).add(entry.getValue()));

		return hits.stream()
				.map(hit -> new SearchResult(hit.type(), hit.id(), hit.title(), hit.projectId(), hit.projectName(),
						hit.excerpt(), byEntry.getOrDefault(hit.id(), List.of()), hit.titleMatch(), hit.archived(),
						hit.completed(), hit.url(), hit.createdAt(), hit.updatedAt()))
				.toList();
	}

	private static Long nullableLong(ResultSet rs, String column) throws SQLException {
		long value = rs.getLong(column);
		return rs.wasNull() ? null : value;
	}

	private static Instant instant(ResultSet rs, String column) throws SQLException {
		Timestamp value = rs.getTimestamp(column);
		return value == null ? null : value.toInstant();
	}

	private record Source(
			String table,
			String titleColumn,
			String contentExpression,
			String projectIdExpression,
			String projectNameExpression,
			String projectJoin,
			String archivedExpression,
			String completedExpression,
			String tagJoin,
			String tagIdColumn
	) {
		private static final Map<EntityType, Source> SOURCES = sources();

		static Source of(EntityType type) {
			return SOURCES.get(type);
		}

		private static Map<EntityType, Source> sources() {
			Map<EntityType, Source> sources = new LinkedHashMap<>();
			sources.put(EntityType.PROJECT, new Source("projects", "s.name",
					"CONCAT_WS(' ', s.description, s.progress_summary, s.next_step, s.blockers, s.technical_decisions, s.start_command, s.build_command)",
					"s.id", "s.name", "", "(s.status = 'ARCHIVED')", "FALSE", null, null));
			sources.put(EntityType.NOTE, content("notes", "s.content", "s.archived", "FALSE", "note_tags", "note_id"));
			sources.put(EntityType.SNIPPET, content("code_snippets", "s.source_code", "s.archived", "FALSE", "snippet_tags", "snippet_id"));
			sources.put(EntityType.IDEA, content("ideas", "s.content", "s.archived", "FALSE", "idea_tags", "idea_id"));
			sources.put(EntityType.TODO, content("todos", "s.content", "FALSE", "s.completed", "todo_tags", "todo_id"));
			return sources;
		}

		private static Source content(String table, String contentExpression, String archived, String completed,
				String tagJoin, String tagIdColumn) {
			return new Source(table, "s.title", contentExpression, "s.project_id", "COALESCE(p.name, '')",
					"LEFT JOIN projects p ON p.id = s.project_id", archived, completed, tagJoin, tagIdColumn);
		}
	}
}
