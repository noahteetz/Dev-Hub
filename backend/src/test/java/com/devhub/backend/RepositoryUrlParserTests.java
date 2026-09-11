package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryReference;
import com.devhub.backend.service.RepositoryUrlParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class RepositoryUrlParserTests {

	private final RepositoryUrlParser parser = new RepositoryUrlParser();

	@Test
	void readsOwnerAndNameFromAnHttpsGitHubUrl() {
		RepositoryReference reference = parser.parse("https://github.com/octocat/Hello-World");

		assertThat(reference.provider()).isEqualTo(RepositoryProvider.GITHUB);
		assertThat(reference.owner()).isEqualTo("octocat");
		assertThat(reference.repositoryName()).isEqualTo("Hello-World");
		assertThat(reference.canonicalUrl()).isEqualTo("https://github.com/octocat/Hello-World");
	}

	@Test
	void readsTheSameReferenceFromAnSshUrl() {
		RepositoryReference reference = parser.parse("git@github.com:octocat/Hello-World.git");

		assertThat(reference.provider()).isEqualTo(RepositoryProvider.GITHUB);
		assertThat(reference.owner()).isEqualTo("octocat");
		assertThat(reference.repositoryName()).isEqualTo("Hello-World");
		assertThat(reference.canonicalUrl()).isEqualTo("https://github.com/octocat/Hello-World");
	}

	@Test
	void removesTheGitSuffixAndTrailingSlashes() {
		RepositoryReference reference = parser.parse("https://github.com/octocat/Hello-World.git/");

		assertThat(reference.repositoryName()).isEqualTo("Hello-World");
		assertThat(reference.canonicalUrl()).isEqualTo("https://github.com/octocat/Hello-World");
	}

	@Test
	void keepsGitLabSubgroupsInTheOwner() {
		RepositoryReference reference = parser.parse("https://gitlab.com/group/subgroup/tooling.git");

		assertThat(reference.provider()).isEqualTo(RepositoryProvider.GITLAB);
		assertThat(reference.owner()).isEqualTo("group/subgroup");
		assertThat(reference.repositoryName()).isEqualTo("tooling");
		assertThat(reference.canonicalUrl()).isEqualTo("https://gitlab.com/group/subgroup/tooling");
	}

	@Test
	void ignoresTheCaseOfTheHost() {
		assertThat(parser.parse("https://GitHub.com/octocat/Hello-World").provider())
				.isEqualTo(RepositoryProvider.GITHUB);
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"https://github.com.evil.example/octocat/Hello-World",
			"https://notgithub.com/octocat/Hello-World",
			"https://gitlab.com.attacker.test/group/tooling",
			"https://my-gitlab.com/group/tooling",
	})
	void treatsLookalikeHostsAsGenericProviders(String url) {
		assertThat(parser.parse(url).provider()).isEqualTo(RepositoryProvider.GENERIC);
	}

	@Test
	void acceptsAGenericGitHostWithASinglePathSegment() {
		RepositoryReference reference = parser.parse("https://git.example.com/tooling.git");

		assertThat(reference.provider()).isEqualTo(RepositoryProvider.GENERIC);
		assertThat(reference.owner()).isEmpty();
		assertThat(reference.repositoryName()).isEqualTo("tooling");
		assertThat(reference.canonicalUrl()).isEqualTo("https://git.example.com/tooling");
	}

	@Test
	void rejectsAKnownProviderUrlWithoutAnOwner() {
		assertThatThrownBy(() -> parser.parse("https://github.com/Hello-World"))
				.isInstanceOf(InvalidRequestException.class)
				.hasMessageContaining("owner");
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"",
			"   ",
			"github.com/octocat/Hello-World",
			"https://github.com",
			"https://github.com/",
			"not a url at all",
	})
	void rejectsInvalidRepositoryUrls(String url) {
		assertThatThrownBy(() -> parser.parse(url)).isInstanceOf(InvalidRequestException.class);
	}

	@Test
	void rejectsAMissingRepositoryUrl() {
		assertThatThrownBy(() -> parser.parse(null))
				.isInstanceOf(InvalidRequestException.class)
				.hasMessageContaining("required");
	}
}
