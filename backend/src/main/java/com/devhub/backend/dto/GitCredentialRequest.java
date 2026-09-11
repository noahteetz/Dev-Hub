package com.devhub.backend.dto;

/**
 * A token on its way in. The value is never echoed back; the API answers with a view that
 * carries only the last few characters.
 */
public record GitCredentialRequest(String label, String token) {

	/** Keeps the token out of logs and stack traces. */
	@Override
	public String toString() {
		return "GitCredentialRequest[label=" + label + ", token=***]";
	}
}
