-- A profile may back several terminals at once, also across workspaces.
-- Recreate the column instead of dropping the generated unique constraint by name,
-- which differs between PostgreSQL and the H2 test database.
ALTER TABLE workspace_terminals ADD COLUMN shared_profile_id VARCHAR(36);
UPDATE workspace_terminals SET shared_profile_id = profile_id;
ALTER TABLE workspace_terminals DROP COLUMN profile_id;
ALTER TABLE workspace_terminals RENAME COLUMN shared_profile_id TO profile_id;
ALTER TABLE workspace_terminals ADD CONSTRAINT workspace_terminals_profile_fk FOREIGN KEY (profile_id) REFERENCES ai_profiles(id);
CREATE INDEX workspace_terminals_profile_idx ON workspace_terminals(profile_id);
