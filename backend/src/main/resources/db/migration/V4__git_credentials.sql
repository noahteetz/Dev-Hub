CREATE TABLE git_credentials (
	provider VARCHAR(32) PRIMARY KEY,
	label VARCHAR(255) NOT NULL DEFAULT '',
	host VARCHAR(255) NOT NULL DEFAULT '',
	token_encrypted TEXT NOT NULL,
	token_hint VARCHAR(16) NOT NULL DEFAULT '',
	account_login VARCHAR(255) NOT NULL DEFAULT '',
	scopes VARCHAR(1024) NOT NULL DEFAULT '',
	status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
	last_error TEXT NOT NULL DEFAULT '',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	last_verified_at TIMESTAMP,
	CONSTRAINT git_credentials_provider_check CHECK (provider IN ('GITHUB', 'GITLAB')),
	CONSTRAINT git_credentials_status_check
		CHECK (status IN ('VERIFIED', 'INVALID', 'UNREADABLE', 'UNVERIFIED'))
);
