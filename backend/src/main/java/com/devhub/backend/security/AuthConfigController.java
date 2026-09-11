package com.devhub.backend.security;

import java.util.List;
import java.util.Map;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Hands the browser its login settings and the identity behind the current
 * token. Keeping the settings on the server means the frontend image is built
 * once and stays valid for every environment it is deployed into.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthConfigController {

	private final AuthProperties properties;

	public AuthConfigController(AuthProperties properties) {
		this.properties = properties;
	}

	/** Public on purpose — the browser has to read this before it can log in. */
	@GetMapping("/config")
	public Map<String, Object> config() {
		if (!properties.isEnabled()) {
			return Map.of("enabled", false);
		}
		return Map.of(
				"enabled", true,
				"issuer", properties.getIssuerUri(),
				"clientId", properties.getClientId(),
				"scope", properties.getScope());
	}

	@GetMapping("/me")
	public Map<String, Object> me(JwtAuthenticationToken authentication) {
		if (authentication == null) {
			return Map.of("authenticated", false);
		}
		Jwt token = authentication.getToken();
		return Map.of(
				"authenticated", true,
				"username", string(token, "preferred_username"),
				"name", string(token, "name"),
				"email", string(token, "email"),
				"roles", roles(authentication.getAuthorities()));
	}

	private static String string(Jwt token, String claim) {
		String value = token.getClaimAsString(claim);
		return value == null ? "" : value;
	}

	private static List<String> roles(java.util.Collection<? extends GrantedAuthority> authorities) {
		return authorities.stream()
				.map(GrantedAuthority::getAuthority)
				.filter(authority -> authority.startsWith("ROLE_"))
				.map(authority -> authority.substring("ROLE_".length()))
				.sorted()
				.toList();
	}
}
