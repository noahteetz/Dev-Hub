package com.devhub.backend.model;

public enum RepositorySyncStatus {
	NEVER_SYNCED,
	SYNCING,
	READY,
	PRIVATE_OR_NOT_FOUND,
	RATE_LIMITED,
	FAILED,
	UNSUPPORTED
}