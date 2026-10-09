CREATE TABLE project_repositories (
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repository_order INTEGER NOT NULL,
    repository_url VARCHAR(2048) NOT NULL,
    PRIMARY KEY (project_id, repository_order),
    UNIQUE (project_id, repository_url)
);

-- Freeze the checkout list at creation, including for existing workspaces.
CREATE TABLE workspace_repositories (
    workspace_id VARCHAR(36) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    repository_order INTEGER NOT NULL,
    repository_url VARCHAR(2048) NOT NULL,
    directory VARCHAR(160) NOT NULL,
    PRIMARY KEY (workspace_id, repository_order),
    UNIQUE (workspace_id, directory)
);
INSERT INTO workspace_repositories (workspace_id, repository_order, repository_url, directory)
SELECT id, 0, repository_url, 'repo' FROM workspaces;
