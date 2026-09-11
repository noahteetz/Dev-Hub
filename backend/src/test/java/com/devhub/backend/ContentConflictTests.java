package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.dto.InboxCaptureRequest;
import com.devhub.backend.exception.ContentConflictException;
import com.devhub.backend.model.ContentEntry;
import com.devhub.backend.model.ContentType;
import com.devhub.backend.service.GlobalContentService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ContentConflictTests {

	@Autowired GlobalContentService content;

	@Test void savesWhenTheClientKnowsTheCurrentServerState() {
		ContentEntry note = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Draft", "First version", List.of(), "", ""));

		ContentEntry saved = content.update(ContentType.NOTE, note.id(),
				new InboxCaptureRequest(ContentType.NOTE, "Draft", "Second version", List.of(), "", "", note.updatedAt()));

		assertThat(saved.content()).isEqualTo("Second version");
	}

	@Test void refusesAStaleSaveAndHandsBackTheServerVersion() {
		ContentEntry note = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Draft", "First version", List.of(), "", ""));
		Instant stale = note.updatedAt().minus(5, ChronoUnit.MINUTES);
		content.update(ContentType.NOTE, note.id(), new InboxCaptureRequest(ContentType.NOTE, "Draft", "Saved elsewhere", List.of(), "", ""));

		assertThatThrownBy(() -> content.update(ContentType.NOTE, note.id(),
				new InboxCaptureRequest(ContentType.NOTE, "Draft", "My local text", List.of(), "", "", stale)))
				.isInstanceOf(ContentConflictException.class)
				.satisfies(thrown -> assertThat(((ContentConflictException) thrown).current().content()).isEqualTo("Saved elsewhere"));

		assertThat(content.find(ContentType.NOTE, note.id()).content()).isEqualTo("Saved elsewhere");
	}

	@Test void keepsWorkingWithoutAnExpectedTimestamp() {
		ContentEntry note = content.capture(new InboxCaptureRequest(ContentType.NOTE, "Draft", "First version", List.of(), "", ""));

		ContentEntry saved = content.update(ContentType.NOTE, note.id(),
				new InboxCaptureRequest(ContentType.NOTE, "Draft", "Forced", List.of(), "", ""));

		assertThat(saved.content()).isEqualTo("Forced");
	}
}
