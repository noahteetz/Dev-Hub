package com.devhub.backend.model;

public enum GitCredentialStatus {
	/** The provider confirmed the token on the last attempt. */
	VERIFIED,
	/** The provider rejected the token. */
	INVALID,
	/** The stored value could not be decrypted, usually after an encryption key change. */
	UNREADABLE,
	/** Stored but never confirmed against the provider. */
	UNVERIFIED
}
