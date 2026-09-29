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
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Date;
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

/** Real signed tokens for two accounts: the owner is taken from the token's subject. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class MultiUserHttpTests {

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

	@Test
	void eachAccountOnlySeesItsOwnProjects() throws Exception {
		String alice = token(UUID.randomUUID().toString(), "alice");
		String bob = token(UUID.randomUUID().toString(), "bob");
		String name = "Alice project " + UUID.randomUUID();

		HttpResponse<String> created = send("POST", "/api/projects", alice,
				"{\"name\":\"" + name + "\",\"description\":\"\",\"repositoryUrl\":\"\",\"deploymentUrl\":\"\",\"links\":[]}");
		assertThat(created.statusCode()).isEqualTo(201);
		long projectId = Long.parseLong(ID.matcher(created.body()).results().findFirst().orElseThrow().group(1));

		assertThat(send("GET", "/api/projects", bob, null).body()).doesNotContain(name);
		assertThat(send("GET", "/api/projects/" + projectId, bob, null).statusCode()).isEqualTo(404);
		assertThat(send("DELETE", "/api/projects/" + projectId, bob, null).statusCode()).isEqualTo(404);

		assertThat(send("GET", "/api/projects", alice, null).body()).contains(name);
		assertThat(send("GET", "/api/projects/" + projectId, alice, null).statusCode()).isEqualTo(200);
	}

	private HttpResponse<String> send(String method, String path, String token, String body) throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
				.header("Authorization", "Bearer " + token);
		if (body == null) {
			request.method(method, HttpRequest.BodyPublishers.noBody());
		} else {
			request.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(body));
		}
		return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
	}

	private static String token(String subject, String username) throws Exception {
		JWTClaimsSet claims = new JWTClaimsSet.Builder()
				.issuer(ISSUER)
				.subject(subject)
				.audience(AUDIENCE)
				.claim("preferred_username", username)
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
