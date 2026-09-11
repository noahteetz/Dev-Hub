package com.devhub.backend.model;

public enum RepositorySyncStatus {
	NEVER_SYNCED,
	SYNCING,
	READY,
	PRIVATE_OR_NOT_FOUND,
	/** A token is stored but the provider rejected it. */
	CREDENTIAL_INVALID,
	/** The token is valid but lacks a scope or an organization authorization. */
	CREDENTIAL_INSUFFICIENT,
	RATE_LIMITED,
	FAILED,
	UNSUPPORTED
}
