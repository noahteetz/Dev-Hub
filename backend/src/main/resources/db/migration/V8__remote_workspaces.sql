CREATE TABLE ai_profiles (
    id VARCHAR(36) PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES app_users(id),
    provider VARCHAR(16) NOT NULL CHECK (provider IN ('CLAUDE', 'CODEX')),
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (owner_id, provider, name)
);
CREATE TABLE workspaces (
    id VARCHAR(36) PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    owner_id BIGINT NOT NULL REFERENCES app_users(id),
    active_key VARCHAR(100) UNIQUE,
    repository_url VARCHAR(2048) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    new_branch BOOLEAN NOT NULL,
    commit_name VARCHAR(255) NOT NULL,
    commit_email VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL,
    desired VARCHAR(24) NOT NULL,
    generation BIGINT NOT NULL DEFAULT 1,
    error VARCHAR(500) NOT NULL DEFAULT '',
    lease_until TIMESTAMP,
    delete_discard BOOLEAN NOT NULL DEFAULT FALSE,
    authorized_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX workspaces_owner_idx ON workspaces(owner_id, status);
CREATE TABLE workspace_terminals (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL REFERENCES workspaces(id),
    provider VARCHAR(16) NOT NULL CHECK (provider IN ('SHELL', 'CLAUDE', 'CODEX')),
    profile_id VARCHAR(36) UNIQUE REFERENCES ai_profiles(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
