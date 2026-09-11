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
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Runs the API with the Keycloak login switched on. A local key pair stands in
 * for the realm: WireMock serves its public half as the key set, so tokens are
 * signed and verified for real without a Keycloak anywhere near the build.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SecurityHttpTests {

	private static final String ISSUER = "https://auth.example.test/realms/dev-hub";
	private static final String AUDIENCE = "dev-hub-backend";
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

	@Test void rejectsRequestsWithoutAToken() throws Exception {
		assertThat(send("/api/projects", null).statusCode()).isEqualTo(401);
	}

	@Test void rejectsATokenWithoutTheRequiredRole() throws Exception {
		String token = token(claims -> claims.claim("realm_access", Map.of("roles", List.of("offline_access"))));

		assertThat(send("/api/projects", token).statusCode()).isEqualTo(403);
	}

	@Test void rejectsATokenMintedForAnotherApplication() throws Exception {
		String token = token(claims -> claims
				.audience("some-other-app")
				.claim("realm_access", Map.of("roles", List.of("devhub-user"))));

		assertThat(send("/api/projects", token).statusCode()).isEqualTo(401);
	}

	@Test void rejectsATokenFromAnotherRealm() throws Exception {
		String token = token(claims -> claims
				.issuer("https://auth.example.test/realms/something-else")
				.claim("realm_access", Map.of("roles", List.of("devhub-user"))));

		assertThat(send("/api/projects", token).statusCode()).isEqualTo(401);
	}

	@Test void acceptsATokenWithTheRequiredRealmRole() throws Exception {
		String token = token(claims -> claims.claim("realm_access", Map.of("roles", List.of("devhub-user"))));

		HttpResponse<String> response = send("/api/projects", token);

		assertThat(response.statusCode()).isEqualTo(200);
	}

	@Test void reportsTheLoggedInUser() throws Exception {
		String token = token(claims -> claims
				.claim("preferred_username", "noah")
				.claim("email", "noah@example.test")
				.claim("realm_access", Map.of("roles", List.of("devhub-user", "devhub-admin"))));

		HttpResponse<String> response = send("/api/auth/me", token);

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.body()).contains("\"username\":\"noah\"", "devhub-admin");
	}

	@Test void servesTheLoginSettingsWithoutAToken() throws Exception {
		HttpResponse<String> response = send("/api/auth/config", null);

		assertThat(response.statusCode()).isEqualTo(200);
		assertThat(response.body()).contains("\"enabled\":true", ISSUER, "dev-hub-frontend");
	}

	@Test void keepsTheHealthProbeOpen() throws Exception {
		assertThat(send("/actuator/health", null).statusCode()).isEqualTo(200);
	}

	private HttpResponse<String> send(String path, String token) throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET();
		if (token != null) {
			request.header("Authorization", "Bearer " + token);
		}
		return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
	}

	/** A realistic Keycloak access token, with the claims the test cares about applied last. */
	private static String token(java.util.function.UnaryOperator<JWTClaimsSet.Builder> customise) throws Exception {
		JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
				.issuer(ISSUER)
				.subject("11111111-2222-3333-4444-555555555555")
				.audience(AUDIENCE)
				.claim("preferred_username", "tester")
				.claim("typ", "Bearer")
				.issueTime(Date.from(Instant.now()))
				.expirationTime(Date.from(Instant.now().plusSeconds(300)));

		SignedJWT jwt = new SignedJWT(
				new JWSHeader.Builder(JWSAlgorithm.RS256)
						.keyID(signingKey.getKeyID())
						.type(JOSEObjectType.JWT)
						.build(),
				customise.apply(claims).build());
		jwt.sign(new RSASSASigner(signingKey));
		return jwt.serialize();
	}
}
