package com.devhub.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ProviderSupportTests {

	@Test
	void namesTheWebHostATokenBelongsTo() {
		assertThat(ProviderSupport.displayHost("https://api.github.com", "github.com")).isEqualTo("github.com");
		assertThat(ProviderSupport.displayHost("https://gitlab.com/api/v4", "gitlab.com")).isEqualTo("gitlab.com");
		assertThat(ProviderSupport.displayHost("https://git.example.com/api/v4", "gitlab.com"))
				.isEqualTo("git.example.com");
	}

	@Test
	void fallsBackWhenTheBaseUrlCannotBeRead() {
		assertThat(ProviderSupport.displayHost("not a url", "github.com")).isEqualTo("github.com");
		assertThat(ProviderSupport.displayHost("", "github.com")).isEqualTo("github.com");
	}
}
