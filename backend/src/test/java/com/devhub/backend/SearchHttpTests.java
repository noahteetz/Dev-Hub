package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SearchHttpTests {

	private static final Pattern ID = Pattern.compile("\"id\":(\\d+)");
	private static final Pattern UPDATED_AT = Pattern.compile("\"updatedAt\":\"([^\"]+)\"");
	private final HttpClient client = HttpClient.newHttpClient();
	@LocalServerPort int port;

	@Test void searchesOverHttpAndRejectsShortTerms() throws Exception {
		send("POST", "/api/inbox", "{\"type\":\"NOTE\",\"title\":\"Grafana dashboard\",\"content\":\"panels\"}");

		HttpResponse<String> found = send("GET", "/api/search?q=grafana&types=NOTE", null);
		assertThat(found.statusCode()).isEqualTo(200);
		assertThat(found.body()).contains("Grafana dashboard", "\"type\":\"NOTE\"", "\"url\":\"/notes/");

		HttpResponse<String> tooShort = send("GET", "/api/search?q=g", null);
		assertThat(tooShort.statusCode()).isEqualTo(400);
		assertThat(tooShort.body()).contains("message");
	}

	@Test void answersAStaleNoteSaveWithTheServerVersion() throws Exception {
		HttpResponse<String> created = send("POST", "/api/inbox", "{\"type\":\"NOTE\",\"title\":\"Conflict note\",\"content\":\"first\"}");
		long id = Long.parseLong(match(ID, created.body()));

		HttpResponse<String> conflict = send("PUT", "/api/notes/" + id,
				"{\"title\":\"Conflict note\",\"content\":\"mine\",\"expectedUpdatedAt\":\"2020-01-01T00:00:00Z\"}");

		assertThat(conflict.statusCode()).isEqualTo(409);
		assertThat(conflict.body()).contains("\"current\"", "first");
		assertThat(send("GET", "/api/notes/" + id, null).body()).contains("first");
	}

	@Test void savesWhenTheClientSendsTheCurrentTimestamp() throws Exception {
		HttpResponse<String> created = send("POST", "/api/inbox", "{\"type\":\"NOTE\",\"title\":\"Fresh note\",\"content\":\"first\"}");
		long id = Long.parseLong(match(ID, created.body()));
		String updatedAt = match(UPDATED_AT, created.body());

		HttpResponse<String> saved = send("PUT", "/api/notes/" + id,
				"{\"title\":\"Fresh note\",\"content\":\"second\",\"expectedUpdatedAt\":\"" + updatedAt + "\"}");

		assertThat(saved.statusCode()).isEqualTo(200);
		assertThat(saved.body()).contains("second");
	}

	@Test void linksEntriesOverHttpAndListsBothDirections() throws Exception {
		long note = Long.parseLong(match(ID, send("POST", "/api/inbox", "{\"type\":\"NOTE\",\"title\":\"Linking note\"}").body()));
		long todo = Long.parseLong(match(ID, send("POST", "/api/inbox", "{\"type\":\"TODO\",\"title\":\"Linked todo\"}").body()));

		HttpResponse<String> created = send("POST", "/api/references",
				"{\"sourceType\":\"NOTE\",\"sourceId\":" + note + ",\"targetType\":\"TODO\",\"targetId\":" + todo + "}");
		assertThat(created.statusCode()).isEqualTo(201);

		assertThat(send("GET", "/api/references?type=TODO&id=" + todo, null).body()).contains("Linking note");
		long reference = Long.parseLong(match(ID, created.body()));
		assertThat(send("DELETE", "/api/references/" + reference, null).statusCode()).isEqualTo(204);
	}

	private static String match(Pattern pattern, String body) {
		Matcher matcher = pattern.matcher(body);
		assertThat(matcher.find()).as("pattern %s in %s", pattern, body).isTrue();
		return matcher.group(1);
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
