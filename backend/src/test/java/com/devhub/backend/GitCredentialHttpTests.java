package com.devhub.backend;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.assertj.core.api.Assertions.assertThat;

import com.github.tomakehurst.wiremock.WireMockServer;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** The token has to be writable over the API but never readable back out of it. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class GitCredentialHttpTests {

	private static final String TOKEN = "ghp_http_level_secret_value";
	private static final WireMockServer PROVIDER = new WireMockServer(options().dynamicPort());

	static {
		PROVIDER.start();
	}

	private final HttpClient client = HttpClient.newHttpClient();
	@LocalServerPort int port;

	@DynamicPropertySource
	static void providerBaseUrls(DynamicPropertyRegistry registry) {
		registry.add("devhub.repository.github.base-url", PROVIDER::baseUrl);
	}

	@AfterAll
	static void stopProvider() {
		PROVIDER.stop();
	}

	@BeforeEach
	void stubUser() {
		PROVIDER.resetAll();
		PROVIDER.stubFor(get(urlPathEqualTo("/user")).willReturn(okJson("{ \"login\": \"octocat\" }")
				.withHeader("x-oauth-scopes", "repo, read:org")));
	}

	@AfterEach
	void removeCredential() throws Exception {
		send("DELETE", "/api/git-credentials/github", null);
	}

	@Test
	void storesATokenAndNeverReturnsItsValue() throws Exception {
		HttpResponse<String> saved = send("PUT", "/api/git-credentials/github",
				"{\"label\":\"Privat\",\"token\":\"" + TOKEN + "\"}");

		assertThat(saved.statusCode()).isEqualTo(200);
		assertThat(saved.body()).doesNotContain(TOKEN);
		assertThat(saved.body()).contains("\"tokenHint\":\"alue\"", "\"accountLogin\":\"octocat\"", "\"status\":\"VERIFIED\"");

		HttpResponse<String> listed = send("GET", "/api/git-credentials", null);
		assertThat(listed.body()).doesNotContain(TOKEN);
		assertThat(listed.body()).contains("\"encryptionConfigured\":true", "Privat", "read:org");
	}

	@Test
	void reportsARejectedTokenWithoutStoringIt() throws Exception {
		PROVIDER.stubFor(get(urlPathEqualTo("/user")).willReturn(aResponse().withStatus(401)));

		HttpResponse<String> rejected = send("PUT", "/api/git-credentials/github",
				"{\"label\":\"\",\"token\":\"" + TOKEN + "\"}");

		assertThat(rejected.statusCode()).isEqualTo(400);
		assertThat(rejected.body()).doesNotContain(TOKEN).contains("rejected");
		assertThat(send("GET", "/api/git-credentials", null).body()).contains("\"credentials\":[]");
	}

	@Test
	void rejectsAnUnknownProvider() throws Exception {
		HttpResponse<String> response = send("PUT", "/api/git-credentials/bitbucket",
				"{\"label\":\"\",\"token\":\"" + TOKEN + "\"}");

		assertThat(response.statusCode()).isEqualTo(400);
		assertThat(response.body()).contains("Unknown provider");
	}

	@Test
	void refusesToListRepositoriesWithoutAToken() throws Exception {
		HttpResponse<String> response = send("GET", "/api/git-repositories?provider=github", null);

		assertThat(response.statusCode()).isEqualTo(400);
		assertThat(response.body()).contains("settings");
	}

	@Test
	void removesAStoredToken() throws Exception {
		send("PUT", "/api/git-credentials/github", "{\"label\":\"\",\"token\":\"" + TOKEN + "\"}");

		assertThat(send("DELETE", "/api/git-credentials/github", null).statusCode()).isEqualTo(204);
		assertThat(send("GET", "/api/git-credentials", null).body()).contains("\"credentials\":[]");
		assertThat(send("DELETE", "/api/git-credentials/github", null).statusCode()).isEqualTo(404);
	}

	private HttpResponse<String> send(String method, String path, String body) throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
		if (body == null) {
			request.method(method, HttpRequest.BodyPublishers.noBody());
		} else {
			request.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(body));
		}
		return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
	}
}
