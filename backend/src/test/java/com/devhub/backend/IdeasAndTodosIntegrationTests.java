package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.dto.IdeaRequest;
import com.devhub.backend.dto.ProjectLinkRequest;
import com.devhub.backend.dto.ProjectRequest;
import com.devhub.backend.dto.TodoRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.Idea;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.Todo;
import com.devhub.backend.service.IdeaService;
import com.devhub.backend.service.ProjectService;
import com.devhub.backend.service.TagService;
import com.devhub.backend.service.TodoService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class IdeasAndTodosIntegrationTests {

	private final IdeaService ideaService;
	private final ProjectService projectService;
	private final TagService tagService;
	private final TodoService todoService;

	@Autowired
	IdeasAndTodosIntegrationTests(
			IdeaService ideaService,
			ProjectService projectService,
			TagService tagService,
			TodoService todoService
	) {
		this.ideaService = ideaService;
		this.projectService = projectService;
		this.tagService = tagService;
		this.todoService = todoService;
	}

	@Test
	void createsProjectMetadataAndConvertsTaggedIdeaToTodo() {
		Project project = projectService.create(new ProjectRequest(
				"Release work",
				"Prepare a release",
				"https://github.com/example/release-work",
				"https://release.example.com",
				List.of(new ProjectLinkRequest("Board", "https://board.example.com"))
		));

		assertThat(project.repositoryUrl()).isEqualTo("https://github.com/example/release-work");
		assertThat(project.deploymentUrl()).isEqualTo("https://release.example.com");
		assertThat(project.links()).singleElement().satisfies(link -> {
			assertThat(link.label()).isEqualTo("Board");
			assertThat(link.url()).isEqualTo("https://board.example.com");
		});

		Idea idea = ideaService.create(project.id(), new IdeaRequest(
				"Add release notes",
				"Generate notes from merged pull requests.",
				List.of("Release", "backend", "release")
		));

		assertThat(idea.tags()).extracting(tag -> tag.name()).containsExactly("backend", "release");
		assertThat(tagService.findAll()).extracting(tag -> tag.name()).contains("backend", "release");

		Todo convertedTodo = ideaService.convertToTodo(project.id(), idea.id());
		assertThat(convertedTodo.title()).isEqualTo(idea.title());
		assertThat(convertedTodo.content()).isEqualTo(idea.content());
		assertThat(convertedTodo.completed()).isFalse();
		assertThat(convertedTodo.tags()).extracting(tag -> tag.name()).containsExactly("backend", "release");

		Idea convertedIdea = ideaService.findById(project.id(), idea.id());
		assertThat(convertedIdea.converted()).isTrue();
		assertThat(convertedIdea.convertedTodoId()).isEqualTo(convertedTodo.id());
		assertThatThrownBy(() -> ideaService.convertToTodo(project.id(), idea.id()))
				.isInstanceOf(InvalidRequestException.class)
				.hasMessageContaining("already been converted");

		Todo completedTodo = todoService.setCompleted(project.id(), convertedTodo.id(), true);
		assertThat(completedTodo.completed()).isTrue();
		assertThat(completedTodo.completedAt()).isNotNull();

		Todo reopenedTodo = todoService.setCompleted(project.id(), convertedTodo.id(), false);
		assertThat(reopenedTodo.completed()).isFalse();
		assertThat(reopenedTodo.completedAt()).isNull();
	}

	@Test
	void removesTagsWhenTheirLastTodoAssociationIsDeleted() {
		Project project = projectService.create(new ProjectRequest(
				"Tag cleanup",
				"",
				"",
				"",
				List.of()
		));
		Todo todo = todoService.create(project.id(), new TodoRequest("Remove me", "", List.of("temporary")));

		todoService.delete(project.id(), todo.id());

		assertThat(tagService.findAll()).extracting(tag -> tag.name()).doesNotContain("temporary");
	}
}