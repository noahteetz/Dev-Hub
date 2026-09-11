package com.devhub.backend.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Leaves the API open. Used by the test suite and by a local run without a
 * Keycloak at hand; production sets devhub.auth.enabled=true and never reaches
 * this class.
 */
@Configuration
@EnableWebSecurity
@ConditionalOnProperty(prefix = "devhub.auth", name = "enabled", havingValue = "false")
class OpenSecurityConfig {

	@Bean
	SecurityFilterChain openSecurity(HttpSecurity http) throws Exception {
		http
				.csrf(csrf -> csrf.disable())
				.authorizeHttpRequests(requests -> requests.anyRequest().permitAll());
		return http.build();
	}
}
