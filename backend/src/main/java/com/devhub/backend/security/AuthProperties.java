package com.devhub.backend.security;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

/**
 * Everything Dev Hub needs to talk to Keycloak. The values are read once at
 * startup: the backend uses them to validate incoming tokens, and hands the
 * public ones to the browser through {@code /api/auth/config} so the built
 * frontend image stays free of environment specific settings.
 */
@ConfigurationProperties("devhub.auth")
public class AuthProperties {

	/**
	 * Turns the whole login requirement off. Only meant for local development and
	 * the test suite — a deployment that serves real data must leave this on.
	 */
	private boolean enabled = true;

	/** Public realm URL, exactly as it appears in the {@code iss} claim of a token. */
	private String issuerUri = "";

	/**
	 * Optional second issuer that is accepted as well, for tokens minted through a
	 * container-internal address instead of the public hostname.
	 */
	private String internalIssuerUri = "";

	/**
	 * Where the signing keys are fetched from. Defaults to the certs endpoint of
	 * {@link #issuerUri}; override it to reach Keycloak over the internal network
	 * while still requiring the public issuer in the token.
	 */
	private String jwkSetUri = "";

	/** The public client the browser logs in with. */
	private String clientId = "dev-hub-frontend";

	/** Scopes the browser requests. */
	private String scope = "openid profile email";

	/** Required {@code aud} entry. Empty disables the audience check. */
	private String audience = "";

	/** Realm role a token must carry to reach the API. Empty means any logged in user. */
	private String requiredRole = "";

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public String getIssuerUri() {
		return issuerUri;
	}

	public void setIssuerUri(String issuerUri) {
		this.issuerUri = trimTrailingSlash(issuerUri);
	}

	public String getInternalIssuerUri() {
		return internalIssuerUri;
	}

	public void setInternalIssuerUri(String internalIssuerUri) {
		this.internalIssuerUri = trimTrailingSlash(internalIssuerUri);
	}

	public String getJwkSetUri() {
		return jwkSetUri;
	}

	public void setJwkSetUri(String jwkSetUri) {
		this.jwkSetUri = jwkSetUri == null ? "" : jwkSetUri.trim();
	}

	public String getClientId() {
		return clientId;
	}

	public void setClientId(String clientId) {
		this.clientId = clientId;
	}

	public String getScope() {
		return scope;
	}

	public void setScope(String scope) {
		this.scope = scope;
	}

	public String getAudience() {
		return audience;
	}

	public void setAudience(String audience) {
		this.audience = audience == null ? "" : audience.trim();
	}

	public String getRequiredRole() {
		return requiredRole;
	}

	public void setRequiredRole(String requiredRole) {
		this.requiredRole = requiredRole == null ? "" : requiredRole.trim();
	}

	/** Every issuer value a token may carry, in the order they were configured. */
	public List<String> acceptedIssuers() {
		List<String> issuers = new ArrayList<>();
		if (StringUtils.hasText(issuerUri)) {
			issuers.add(issuerUri);
		}
		if (StringUtils.hasText(internalIssuerUri) && !issuers.contains(internalIssuerUri)) {
			issuers.add(internalIssuerUri);
		}
		return issuers;
	}

	/** The configured key set, or the realm's default certs endpoint. */
	public String resolvedJwkSetUri() {
		if (StringUtils.hasText(jwkSetUri)) {
			return jwkSetUri;
		}
		return issuerUri + "/protocol/openid-connect/certs";
	}

	private static String trimTrailingSlash(String value) {
		if (value == null) {
			return "";
		}
		String trimmed = value.trim();
		while (trimmed.endsWith("/")) {
			trimmed = trimmed.substring(0, trimmed.length() - 1);
		}
		return trimmed;
	}
}
