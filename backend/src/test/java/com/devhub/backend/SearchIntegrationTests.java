package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.dto.ContentArchiveRequest;
import com.devhub.backend.dto.ContentAssignmentRequest;
import com.devhub.backend.dto.InboxCaptureRequest;
import com.devhub.backend.dto.ProjectContextRequest;
import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.ContentEntry;
import com.devhub.backend.model.ContentType;
import com.devhub.backend.model.EntityType;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.SearchResult;
import com.devhub.backend.service.GlobalContentService;
import com.devhub.backend.service.ProjectService;
import com.devhub.backend.service.SearchService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SearchIntegrationTests {

	@Autowired SearchService search;
	@Autowired GlobalContentService content;
	@Autowired ProjectService projects;
	@Autowired JdbcTemplate jdbc;

	@Test void findsEveryContentTypeIncludingTheWorkingContextOfAProject() {
		Project project = projects.create(new ProjectRequest("Flyway playground", "", "", "", List.of()));
		projects.updateContext(project.id(), new ProjectContextRequest("", "Migrate the flyway baseline", "", "", "", ""));
		for (ContentType type : ContentType.values()) {
			content.capture(new InboxCaptureRequest(type, type + " about flyway", "Body", List.of(), "", ""));
		}

		List<SearchResult> results = search.search("flyway", null, null, null, false, false, 20, 0);

		assertThat(results).extracting(SearchResult::type)
				.contains(EntityType.PROJECT, EntityType.NOTE, EntityType.SNIPPET, EntityType.IDEA, EntityType.TODO);
		assertThat(results).allSatisfy(result -> assertThat(result.url()).isNotBlank());
	}

	@Test void ranksTitleHitsBeforeContentHitsAndNewerBeforeOlder() {
		ContentEntry olderTitle = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Kafka setup", "Body", List.of(), "", ""));
		ContentEntry newerTitle = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Kafka retries", "Body", List.of(), "", ""));
		ContentEntry contentHit = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Broker notes", "We run kafka here", List.of(), "", ""));
		touch("notes", olderTitle.id(), "2026-01-01 10:00:00");
		touch("notes", newerTitle.id(), "2026-02-01 10:00:00");
		touch("notes", contentHit.id(), "2026-03-01 10:00:00");

		List<SearchResult> results = search.search("kafka", List.of("NOTE"), null, null, false, false, 20, 0);

		assertThat(results).extracting(SearchResult::title)
				.containsExactly("Kafka retries", "Kafka setup", "Broker notes");
		assertThat(results.getLast().excerpt()).contains("kafka");
	}

	@Test void appliesTypeProjectTagAndStateFilters() {
		Project project = projects.create(new ProjectRequest("Filter target", "", "", "", List.of()));
		ContentEntry assigned = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Redis cache", "", List.of("infra"), "", ""));
		content.assign(ContentType.NOTE, assigned.id(), new ContentAssignmentRequest(project.id()));
		content.capture(new InboxCaptureRequest(ContentType.IDEA, "Redis pubsub", "", List.of("later"), "", ""));
		ContentEntry archived = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Redis cluster", "", List.of(), "", ""));
		content.archive(ContentType.NOTE, archived.id(), new ContentArchiveRequest(true));
		ContentEntry todo = content.capture(new InboxCaptureRequest(ContentType.TODO, "Redis upgrade", "", List.of(), "", ""));
		content.setCompleted(todo.id(), true);

		assertThat(search.search("redis", List.of("NOTE"), null, null, false, false, 20, 0))
				.extracting(SearchResult::title).containsExactly("Redis cache");
		assertThat(search.search("redis", null, project.id(), null, false, false, 20, 0))
				.extracting(SearchResult::title).containsExactly("Redis cache");
		assertThat(search.search("redis", null, null, List.of("later"), false, false, 20, 0))
				.extracting(SearchResult::title).containsExactly("Redis pubsub");
		assertThat(search.search("redis", null, null, null, true, false, 20, 0))
				.extracting(SearchResult::title).contains("Redis cluster");
		assertThat(search.search("redis", null, null, null, false, true, 20, 0))
				.extracting(SearchResult::title).contains("Redis upgrade");
	}

	@Test void rejectsTermsThatAreTooShortAndInvalidPaging() {
		assertThatThrownBy(() -> search.search("a", null, null, null, false, false, 20, 0))
				.isInstanceOf(InvalidRequestException.class);
		assertThatThrownBy(() -> search.search("   ", null, null, null, false, false, 20, 0))
				.isInstanceOf(InvalidRequestException.class);
		assertThatThrownBy(() -> search.search("kafka", null, null, null, false, false, 0, 0))
				.isInstanceOf(InvalidRequestException.class);
		assertThatThrownBy(() -> search.search("kafka", List.of("UNKNOWN"), null, null, false, false, 20, 0))
				.isInstanceOf(InvalidRequestException.class);
	}

	@Test void answersQuicklyOnAFewThousandEntries() {
		jdbc.batchUpdate("INSERT INTO notes (project_id, title, content) VALUES (NULL, ?, ?)",
				java.util.stream.IntStream.range(0, 4000)
						.mapToObj(index -> new Object[]{"Note " + index, "Filler body " + index})
						.toList());
		content.capture(new InboxCaptureRequest(ContentType.NOTE, "Needle in the haystack", "", List.of(), "", ""));

		search.search("needle", null, null, null, false, false, 20, 0);
		long start = System.nanoTime();
		List<SearchResult> results = search.search("needle", null, null, null, false, false, 20, 0);
		long milliseconds = (System.nanoTime() - start) / 1_000_000;

		assertThat(results).extracting(SearchResult::title).containsExactly("Needle in the haystack");
		assertThat(milliseconds).isLessThan(250);
	}

	private void touch(String table, long id, String timestamp) {
		jdbc.update("UPDATE " + table + " SET updated_at = ? WHERE id = ?", java.sql.Timestamp.valueOf(timestamp), id);
	}
}
