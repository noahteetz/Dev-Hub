package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class GlobalContentHttpTests {
	private static final Pattern ID = Pattern.compile("\\\"id\\\":(\\d+)");
	private final HttpClient client = HttpClient.newHttpClient();
	@LocalServerPort int port;

	@Test void exposesCaptureListAssignmentAndConflictResponses() throws Exception {
		HttpResponse<String> captured = send("POST", "/api/inbox", "{\"type\":\"IDEA\",\"title\":\"HTTP idea\",\"content\":\"Body\",\"tags\":[\"http\"]}");
		assertThat(captured.statusCode()).isEqualTo(201);
		long id = Long.parseLong(ID.matcher(captured.body()).results().findFirst().orElseThrow().group(1));
		assertThat(send("GET", "/api/inbox?type=IDEA", null).body()).contains("HTTP idea", "http");
		assertThat(send("PATCH", "/api/ideas/" + id + "/assignment", "{\"projectId\":999999}").statusCode()).isEqualTo(404);
		assertThat(send("POST", "/api/inbox/ideas/" + id + "/promote", null).statusCode()).isEqualTo(201);
		assertThat(send("POST", "/api/inbox/ideas/" + id + "/promote", null).statusCode()).isEqualTo(409);
	}

	private HttpResponse<String> send(String method, String path, String body) throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
		if (body == null) request.method(method, HttpRequest.BodyPublishers.noBody());
		else request.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(body));
		return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
	}
}
