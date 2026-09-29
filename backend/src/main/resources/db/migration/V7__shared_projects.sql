-- The owner is not listed here; projects.owner_id stays the only source of ownership.
CREATE TABLE project_members (
	project_id BIGINT NOT NULL,
	user_id BIGINT NOT NULL,
	role VARCHAR(16) NOT NULL,
	added_by BIGINT NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT project_members_pk PRIMARY KEY (project_id, user_id),
	CONSTRAINT project_members_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
	CONSTRAINT project_members_user_fk FOREIGN KEY (user_id) REFERENCES app_users(id),
	CONSTRAINT project_members_added_by_fk FOREIGN KEY (added_by) REFERENCES app_users(id),
	CONSTRAINT project_members_role_check CHECK (role IN ('VIEWER', 'EDITOR'))
);
CREATE INDEX project_members_user_idx ON project_members(user_id);

-- A favorite is a personal mark, so it moves off the shared project row.
CREATE TABLE project_user_settings (
	project_id BIGINT NOT NULL,
	user_id BIGINT NOT NULL,
	favorite BOOLEAN NOT NULL DEFAULT FALSE,
	CONSTRAINT project_user_settings_pk PRIMARY KEY (project_id, user_id),
	CONSTRAINT project_user_settings_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
	CONSTRAINT project_user_settings_user_fk FOREIGN KEY (user_id) REFERENCES app_users(id)
);
INSERT INTO project_user_settings (project_id, user_id, favorite)
	SELECT id, owner_id, TRUE FROM projects WHERE favorite = TRUE;
ALTER TABLE projects DROP COLUMN favorite;

-- owner_id says whose data an entry is; created_by says who wrote it.
ALTER TABLE notes ADD COLUMN created_by BIGINT;
UPDATE notes SET created_by = owner_id;
ALTER TABLE notes ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE notes ADD CONSTRAINT notes_created_by_fk FOREIGN KEY (created_by) REFERENCES app_users(id);

ALTER TABLE code_snippets ADD COLUMN created_by BIGINT;
UPDATE code_snippets SET created_by = owner_id;
ALTER TABLE code_snippets ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE code_snippets ADD CONSTRAINT code_snippets_created_by_fk FOREIGN KEY (created_by) REFERENCES app_users(id);

ALTER TABLE ideas ADD COLUMN created_by BIGINT;
UPDATE ideas SET created_by = owner_id;
ALTER TABLE ideas ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE ideas ADD CONSTRAINT ideas_created_by_fk FOREIGN KEY (created_by) REFERENCES app_users(id);

ALTER TABLE todos ADD COLUMN created_by BIGINT;
UPDATE todos SET created_by = owner_id;
ALTER TABLE todos ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE todos ADD CONSTRAINT todos_created_by_fk FOREIGN KEY (created_by) REFERENCES app_users(id);

ALTER TABLE app_users ADD COLUMN display_name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE app_users ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT '';
