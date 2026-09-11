package com.devhub.backend.security;

import java.util.List;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Accepts a token whose issuer is one of the configured realm URLs. Keycloak is
 * reachable under a public hostname and, from inside the Docker network, under
 * a second one; a token minted through either has to pass.
 */
class IssuerValidator implements OAuth2TokenValidator<Jwt> {

	private final List<String> accepted;

	IssuerValidator(List<String> accepted) {
		this.accepted = List.copyOf(accepted);
	}

	@Override
	public OAuth2TokenValidatorResult validate(Jwt token) {
		String issuer = token.getIssuer() == null ? null : token.getIssuer().toString();
		if (issuer != null && accepted.contains(stripTrailingSlash(issuer))) {
			return OAuth2TokenValidatorResult.success();
		}
		return OAuth2TokenValidatorResult.failure(new OAuth2Error(
				"invalid_token",
				"The token was issued by " + issuer + ", which this application does not trust",
				"https://tools.ietf.org/html/rfc6750#section-3.1"));
	}

	private static String stripTrailingSlash(String value) {
		String result = value;
		while (result.endsWith("/")) {
			result = result.substring(0, result.length() - 1);
		}
		return result;
	}
}
