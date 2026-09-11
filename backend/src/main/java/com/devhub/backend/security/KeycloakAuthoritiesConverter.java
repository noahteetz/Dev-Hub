package com.devhub.backend.security;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Turns the roles Keycloak puts into a token into Spring authorities. Realm
 * roles live under {@code realm_access.roles}, the roles of a single client
 * under {@code resource_access.<client>.roles}; both are read so a role can be
 * granted either way without touching the backend.
 */
class KeycloakAuthoritiesConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

	private final String clientId;

	KeycloakAuthoritiesConverter(String clientId) {
		this.clientId = clientId;
	}

	@Override
	public Collection<GrantedAuthority> convert(Jwt jwt) {
		Set<GrantedAuthority> authorities = new LinkedHashSet<>();
		roles(jwt.getClaimAsMap("realm_access")).forEach(role -> authorities.add(authority(role)));

		Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
		if (resourceAccess != null && resourceAccess.get(clientId) instanceof Map<?, ?> client) {
			roles(client).forEach(role -> authorities.add(authority(role)));
		}
		return authorities;
	}

	private static List<String> roles(Map<?, ?> claim) {
		if (claim == null || !(claim.get("roles") instanceof Collection<?> roles)) {
			return List.of();
		}
		return roles.stream().filter(String.class::isInstance).map(String.class::cast).toList();
	}

	private static GrantedAuthority authority(String role) {
		return new SimpleGrantedAuthority("ROLE_" + role);
	}
}
