ALTER TABLE notes ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE code_snippets ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE ideas ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE todos ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE notes ADD COLUMN source_url VARCHAR(2048) NOT NULL DEFAULT '';
ALTER TABLE ideas ADD COLUMN source_url VARCHAR(2048) NOT NULL DEFAULT '';
ALTER TABLE notes ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE code_snippets ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE code_snippets ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE ideas ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ideas ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE notes ADD COLUMN filed_at TIMESTAMP;
ALTER TABLE code_snippets ADD COLUMN filed_at TIMESTAMP;
ALTER TABLE ideas ADD COLUMN filed_at TIMESTAMP;
ALTER TABLE todos ADD COLUMN filed_at TIMESTAMP;

CREATE TABLE note_tags (
	note_id BIGINT NOT NULL,
	tag_id BIGINT NOT NULL,
	CONSTRAINT note_tags_note_fk FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
	CONSTRAINT note_tags_tag_fk FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
	CONSTRAINT note_tags_unique UNIQUE (note_id, tag_id)
);

CREATE TABLE snippet_tags (
	snippet_id BIGINT NOT NULL,
	tag_id BIGINT NOT NULL,
	CONSTRAINT snippet_tags_snippet_fk FOREIGN KEY (snippet_id) REFERENCES code_snippets(id) ON DELETE CASCADE,
	CONSTRAINT snippet_tags_tag_fk FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
	CONSTRAINT snippet_tags_unique UNIQUE (snippet_id, tag_id)
);

UPDATE notes SET project_id = NULL WHERE project_id IN (SELECT id FROM projects WHERE is_system = TRUE);
UPDATE code_snippets SET project_id = NULL WHERE project_id IN (SELECT id FROM projects WHERE is_system = TRUE);
UPDATE ideas SET project_id = NULL WHERE project_id IN (SELECT id FROM projects WHERE is_system = TRUE);
UPDATE todos SET project_id = NULL WHERE project_id IN (SELECT id FROM projects WHERE is_system = TRUE);
DELETE FROM projects WHERE is_system = TRUE;
ALTER TABLE projects DROP COLUMN is_system;

CREATE INDEX note_tags_tag_id_idx ON note_tags(tag_id);
CREATE INDEX snippet_tags_tag_id_idx ON snippet_tags(tag_id);
CREATE INDEX notes_inbox_idx ON notes(project_id, archived, created_at);
CREATE INDEX code_snippets_inbox_idx ON code_snippets(project_id, archived, created_at);
CREATE INDEX ideas_inbox_idx ON ideas(project_id, archived, created_at);
CREATE INDEX todos_inbox_idx ON todos(project_id, completed, created_at);
