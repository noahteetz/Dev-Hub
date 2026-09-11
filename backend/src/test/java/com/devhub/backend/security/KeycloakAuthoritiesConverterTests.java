package com.devhub.backend.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

class KeycloakAuthoritiesConverterTests {

	private final KeycloakAuthoritiesConverter converter = new KeycloakAuthoritiesConverter("dev-hub-frontend");

	@Test void readsRealmAndClientRoles() {
		Jwt token = jwt(Map.of(
				"realm_access", Map.of("roles", List.of("devhub-user")),
				"resource_access", Map.of("dev-hub-frontend", Map.of("roles", List.of("devhub-admin")))));

		assertThat(names(converter.convert(token))).containsExactlyInAnyOrder("ROLE_devhub-user", "ROLE_devhub-admin");
	}

	@Test void ignoresRolesOfOtherClients() {
		Jwt token = jwt(Map.of(
				"resource_access", Map.of("some-other-app", Map.of("roles", List.of("admin")))));

		assertThat(converter.convert(token)).isEmpty();
	}

	@Test void survivesATokenWithoutAnyRoles() {
		assertThat(converter.convert(jwt(Map.of()))).isEmpty();
	}

	private static List<String> names(java.util.Collection<GrantedAuthority> authorities) {
		return authorities.stream().map(GrantedAuthority::getAuthority).toList();
	}

	private static Jwt jwt(Map<String, Object> claims) {
		Jwt.Builder builder = Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject("user")
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300));
		claims.forEach(builder::claim);
		return builder.build();
	}
}
