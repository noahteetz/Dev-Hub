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
class WorkspaceSecurityHttpTests {

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
		registry.add("devhub.workspace.enabled", () -> "true");
        registry.add("devhub.workspace.worker-enabled", () -> "false");
        registry.add("devhub.workspace.runner-token", () -> "test-runner-token-with-at-least-32-characters");
        registry.add("devhub.auth.enabled", () -> "true");
		registry.add("devhub.auth.issuer-uri", () -> ISSUER);
		registry.add("devhub.auth.audience", () -> AUDIENCE);
		registry.add("devhub.auth.required-role", () -> "devhub-user");
		registry.add("devhub.auth.jwk-set-uri", () -> KEYCLOAK.baseUrl() + "/certs");
	}

    @Test void workspaceRoleMustBeGrantedInTheRealm() throws Exception {
        String user = token(c -> c.claim("realm_access", Map.of("roles", List.of("devhub-user"))));
        assertThat(send("/api/ai-profiles", user).statusCode()).isEqualTo(403);
        String workspace = token(c -> c.claim("realm_access", Map.of("roles", List.of("devhub-user", "devhub-workspace"))));
        assertThat(send("/api/ai-profiles", workspace).statusCode()).isEqualTo(200);
        String clientRole = token(c -> c.claim("realm_access", Map.of("roles", List.of("devhub-user")))
                .claim("resource_access", Map.of("dev-hub-frontend", Map.of("roles", List.of("devhub-workspace")))));
        assertThat(send("/api/ai-profiles", clientRole).statusCode()).isEqualTo(403);
    }
    @Test void runnerRoutesHaveTheirOwnAuthenticationAndDoNotLeakCredentials() throws Exception {
        String path = "/api/workspace-runner/credentials/11111111-2222-3333-4444-555555555555";
        assertThat(send(path, null).statusCode()).isEqualTo(403);
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("X-Runner-Token", "incorrect-token-with-at-least-32-characters").GET().build();
        assertThat(client.send(request, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(403);
    }
    @Test void anonymousWebsocketAndForeignOriginCannotBypassAuthentication() throws Exception {
        for (String origin : List.of("http://localhost:5173", "https://evil.example")) {
            try {
                client.newWebSocketBuilder().header("Origin", origin)
                        .buildAsync(URI.create("ws://localhost:" + port + "/api/workspaces/11111111-2222-3333-4444-555555555555/terminals/11111111-2222-3333-4444-555555555555/connect?ticket=invalid"),
                                new java.net.http.WebSocket.Listener() {}).join();
                throw new AssertionError("Unauthenticated terminal handshake succeeded");
            } catch (java.util.concurrent.CompletionException e) {
                assertThat(e.getCause()).isInstanceOf(java.net.http.WebSocketHandshakeException.class);
                assertThat(((java.net.http.WebSocketHandshakeException) e.getCause()).getResponse().statusCode()).isEqualTo(403);
            }
        }
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
