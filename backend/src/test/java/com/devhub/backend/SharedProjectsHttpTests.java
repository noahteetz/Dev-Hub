package com.devhub.backend;

import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.assertj.core.api.Assertions.assertThat;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** The rights matrix over HTTP with real signed tokens: role by endpoint gives the expected status. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SharedProjectsHttpTests {

	private static final String ISSUER = "https://auth.example.test/realms/dev-hub";
	private static final String AUDIENCE = "dev-hub-backend";
	private static final Pattern ID = Pattern.compile("\"id\":(\\d+)");
	private static final WireMockServer KEYCLOAK = new WireMockServer(options().dynamicPort());
	private static RSAKey signingKey;

	private final HttpClient client = HttpClient.newHttpClient();
	@LocalServerPort int port;

	@BeforeAll
	static void startRealm() throws Exception {
		signingKey = new RSAKeyGenerator(2048).keyID("test-key").keyUse(KeyUse.SIGNATURE).generate();
		KEYCLOAK.start();
		KEYCLOAK.stubFor(get(urlPathEqualTo("/certs"))
				.willReturn(okJson("{\"keys\":[" + signingKey.toPublicJWK().toJSONString() + "]}")));
	}

	@AfterAll
	static void stopRealm() {
		KEYCLOAK.stop();
	}

	@DynamicPropertySource
	static void authSettings(DynamicPropertyRegistry registry) {
		registry.add("devhub.auth.enabled", () -> "true");
		registry.add("devhub.auth.issuer-uri", () -> ISSUER);
		registry.add("devhub.auth.audience", () -> AUDIENCE);
		registry.add("devhub.auth.required-role", () -> "devhub-user");
		registry.add("devhub.auth.jwk-set-uri", () -> KEYCLOAK.baseUrl() + "/certs");
	}

	private record Row(String label, String method, String path, String body, int owner, int editor, int viewer, int outsider) {
	}

	@Test
	void everyRoleGetsExactlyTheRightsOfTheMatrix() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String owner = token("owner-" + suffix);
		String editor = token("editor-" + suffix);
		String viewer = token("viewer-" + suffix);
		String outsider = token("outsider-" + suffix);
		for (String token : List.of(editor, viewer, outsider)) {
			assertThat(send("GET", "/api/projects", token, null).statusCode()).isEqualTo(200);
		}

		long projectId = idOf(send("POST", "/api/projects", owner,
				"{\"name\":\"Matrix " + suffix + "\",\"description\":\"\",\"repositoryUrl\":\"\",\"deploymentUrl\":\"\",\"links\":[]}"));
		long noteId = idOf(send("POST", "/api/projects/" + projectId + "/notes", owner, "{\"title\":\"n\",\"content\":\"c\"}"));
		assertThat(send("POST", "/api/projects/" + projectId + "/members", owner,
				"{\"userId\":" + lookup(owner, "editor-" + suffix) + ",\"role\":\"EDITOR\"}").statusCode()).isEqualTo(201);
		assertThat(send("POST", "/api/projects/" + projectId + "/members", owner,
				"{\"userId\":" + lookup(owner, "viewer-" + suffix) + ",\"role\":\"VIEWER\"}").statusCode()).isEqualTo(201);

		String p = "/api/projects/" + projectId;
		String note = "{\"title\":\"t\",\"content\":\"c\"}";
		String item = "{\"title\":\"t\",\"content\":\"\",\"tags\":[]}";
		List<Row> matrix = List.of(
				new Row("read project", "GET", p, null, 200, 200, 200, 404),
				new Row("read notes", "GET", p + "/notes", null, 200, 200, 200, 404),
				new Row("read repository", "GET", p + "/repository", null, 200, 200, 200, 404),
				new Row("read members", "GET", p + "/members", null, 200, 200, 200, 404),
				new Row("read tags", "GET", "/api/tags?projectId=" + projectId, null, 200, 200, 200, 404),
				new Row("set favorite", "PUT", p + "/favorite", "{\"favorite\":true}", 200, 200, 200, 404),
				new Row("create note", "POST", p + "/notes", note, 201, 201, 403, 404),
				new Row("update note", "PUT", p + "/notes/" + noteId, note, 200, 200, 403, 404),
				new Row("create idea", "POST", p + "/ideas", item, 201, 201, 403, 404),
				new Row("create todo", "POST", p + "/todos", item, 201, 201, 403, 404),
				new Row("edit context", "PUT", p + "/context",
						"{\"progressSummary\":\"\",\"nextStep\":\"n\",\"blockers\":\"\",\"startCommand\":\"\",\"buildCommand\":\"\",\"technicalDecisions\":\"\"}",
						200, 200, 403, 404),
				new Row("edit master data", "PUT", p,
						"{\"name\":\"Renamed\",\"description\":\"\",\"repositoryUrl\":\"\",\"deploymentUrl\":\"\",\"links\":[]}",
						200, 403, 403, 404),
				new Row("edit status", "PATCH", p + "/organization", "{\"status\":\"ACTIVE\",\"priority\":1}", 200, 403, 403, 404),
				new Row("refresh repository", "POST", p + "/repository/refresh", null, 400, 403, 403, 404),
				new Row("add member", "POST", p + "/members", "{\"userId\":987654321,\"role\":\"VIEWER\"}", 404, 403, 403, 404),
				new Row("change role", "PATCH", p + "/members/987654321", "{\"role\":\"VIEWER\"}", 404, 403, 403, 404),
				new Row("remove member", "DELETE", p + "/members/987654321", null, 404, 403, 403, 404),
				new Row("archive", "POST", p + "/archive", "{\"reason\":\"done\"}", 200, 403, 403, 404),
				new Row("restore", "POST", p + "/restore", null, 200, 403, 403, 404),
				new Row("delete", "DELETE", p, null, 204, 403, 403, 404)
		);

		Map<String, String> tokens = new LinkedHashMap<>();
		tokens.put("editor", editor);
		tokens.put("viewer", viewer);
		tokens.put("outsider", outsider);
		tokens.put("owner", owner);
		for (Row row : matrix) {
			for (Map.Entry<String, String> caller : tokens.entrySet()) {
				int expected = switch (caller.getKey()) {
					case "owner" -> row.owner();
					case "editor" -> row.editor();
					case "viewer" -> row.viewer();
					default -> row.outsider();
				};
				HttpResponse<String> response = send(row.method(), row.path(), caller.getValue(), row.body());
				assertThat(response.statusCode()).as("%s as %s: %s", row.label(), caller.getKey(), response.body()).isEqualTo(expected);
			}
		}
	}

	@Test
	void leavingAProjectIsForMembersOnly() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String owner = token("owner-" + suffix);
		String member = token("member-" + suffix);
		long projectId = idOf(send("POST", "/api/projects", owner,
				"{\"name\":\"Leave " + suffix + "\",\"description\":\"\",\"repositoryUrl\":\"\",\"deploymentUrl\":\"\",\"links\":[]}"));
		send("GET", "/api/projects", member, null);
		send("POST", "/api/projects/" + projectId + "/members", owner,
				"{\"userId\":" + lookup(owner, "member-" + suffix) + ",\"role\":\"VIEWER\"}");

		assertThat(send("DELETE", "/api/projects/" + projectId + "/members/me", owner, null).statusCode()).isEqualTo(400);
		assertThat(send("DELETE", "/api/projects/" + projectId + "/members/me", member, null).statusCode()).isEqualTo(204);
		assertThat(send("GET", "/api/projects/" + projectId, member, null).statusCode()).isEqualTo(404);
	}

	@Test
	void usersAreFoundOnlyByAnExactUsernameOrEmail() throws Exception {
		String suffix = UUID.randomUUID().toString().substring(0, 8);
		String caller = token("caller-" + suffix);
		send("GET", "/api/projects", token("target-" + suffix), null);
		send("GET", "/api/projects", caller, null);

		assertThat(send("GET", "/api/users/lookup?query=" + encode("target-" + suffix), caller, null).statusCode()).isEqualTo(200);
		assertThat(send("GET", "/api/users/lookup?query=" + encode("TARGET-" + suffix + "@example.test"), caller, null).statusCode()).isEqualTo(200);
		assertThat(send("GET", "/api/users/lookup?query=" + encode("target-"), caller, null).statusCode()).isEqualTo(404);
		assertThat(send("GET", "/api/users/lookup?query=" + encode("target-" + suffix.substring(0, 4)), caller, null).statusCode()).isEqualTo(404);
		assertThat(send("GET", "/api/users/lookup?query=%20", caller, null).statusCode()).isEqualTo(400);
		assertThat(send("GET", "/api/users/lookup?query=x", null, null).statusCode()).isEqualTo(401);
	}

	private long lookup(String token, String username) throws Exception {
		HttpResponse<String> response = send("GET", "/api/users/lookup?query=" + encode(username), token, null);
		assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
		return idOf(response);
	}

	private static long idOf(HttpResponse<String> response) {
		assertThat(response.statusCode()).as(response.body()).isIn(200, 201);
		return Long.parseLong(ID.matcher(response.body()).results().findFirst().orElseThrow().group(1));
	}

	private static String encode(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}

	private HttpResponse<String> send(String method, String path, String token, String body) throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
		if (token != null) {
			request.header("Authorization", "Bearer " + token);
		}
		if (body == null) {
			request.method(method, HttpRequest.BodyPublishers.noBody());
		} else {
			request.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(body));
		}
		return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
	}

	/** The subject is derived from the username, so the same name always means the same account. */
	private static String token(String username) throws Exception {
		JWTClaimsSet claims = new JWTClaimsSet.Builder()
				.issuer(ISSUER)
				.subject("sub-" + username)
				.audience(AUDIENCE)
				.claim("preferred_username", username)
				.claim("email", username + "@example.test")
				.claim("typ", "Bearer")
				.claim("realm_access", Map.of("roles", List.of("devhub-user")))
				.issueTime(Date.from(Instant.now()))
				.expirationTime(Date.from(Instant.now().plusSeconds(300)))
				.build();
		SignedJWT jwt = new SignedJWT(
				new JWSHeader.Builder(JWSAlgorithm.RS256)
						.keyID(signingKey.getKeyID())
						.type(JOSEObjectType.JWT)
						.build(),
				claims);
		jwt.sign(new RSASSASigner(signingKey));
		return jwt.serialize();
	}
}
