package com.devhub.backend.security;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

/**
 * Locks the API behind a Keycloak login. The browser performs the login itself
 * and sends the resulting access token as a bearer header, so the backend never
 * holds a session: every request is authorised from the token alone.
 */
@Configuration
@EnableWebSecurity
@ConditionalOnProperty(prefix = "devhub.auth", name = "enabled", havingValue = "true", matchIfMissing = true)
class OidcSecurityConfig {

	/** Reachable without a token: the login settings the browser needs, and the container health probe. */
	static final String[] PUBLIC_PATHS = { "/api/auth/config", "/actuator/health", "/actuator/health/**" };

	@Bean
	SecurityFilterChain apiSecurity(HttpSecurity http, AuthProperties properties) throws Exception {
		String requiredRole = properties.getRequiredRole();

		http
				.csrf(csrf -> csrf.disable())
				.cors(cors -> cors.disable())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(requests -> {
					requests.requestMatchers(PUBLIC_PATHS).permitAll();
					if (StringUtils.hasText(requiredRole)) {
						requests.anyRequest().hasRole(requiredRole);
					} else {
						requests.anyRequest().authenticated();
					}
				})
				.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(authenticationConverter(properties))));

		return http.build();
	}

	@Bean
	NimbusJwtDecoder jwtDecoder(AuthProperties properties) {
		List<String> issuers = properties.acceptedIssuers();
		if (issuers.isEmpty()) {
			throw new IllegalStateException(
					"devhub.auth.issuer-uri is missing. Point it at the Keycloak realm, "
							+ "or set devhub.auth.enabled=false to run without a login.");
		}

		NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(properties.resolvedJwkSetUri()).build();

		List<OAuth2TokenValidator<Jwt>> validators = new ArrayList<>();
		validators.add(JwtValidators.createDefault());
		validators.add(new IssuerValidator(issuers));
		if (StringUtils.hasText(properties.getAudience())) {
			validators.add(new AudienceValidator(properties.getAudience()));
		}
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(validators));
		return decoder;
	}

	private static JwtAuthenticationConverter authenticationConverter(AuthProperties properties) {
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(new KeycloakAuthoritiesConverter(properties.getClientId()));
		// Keycloak's `sub` is an opaque id; the username reads far better in logs.
		converter.setPrincipalClaimName("preferred_username");
		return converter;
	}
}
