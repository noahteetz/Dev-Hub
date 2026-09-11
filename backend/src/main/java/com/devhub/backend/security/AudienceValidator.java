package com.devhub.backend.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Rejects a token that was not minted for this backend. Without it any token
 * from the same realm — including one a different application handed out —
 * would open the API.
 */
class AudienceValidator implements OAuth2TokenValidator<Jwt> {

	private final String audience;

	AudienceValidator(String audience) {
		this.audience = audience;
	}

	@Override
	public OAuth2TokenValidatorResult validate(Jwt token) {
		if (token.getAudience() != null && token.getAudience().contains(audience)) {
			return OAuth2TokenValidatorResult.success();
		}
		return OAuth2TokenValidatorResult.failure(new OAuth2Error(
				"invalid_token",
				"The token is not meant for this application (missing audience " + audience + ")",
				"https://tools.ietf.org/html/rfc6750#section-3.1"));
	}
}
