ALTER TABLE repository_metadata ADD COLUMN etag VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE repository_metadata ADD COLUMN rate_limit_limit INTEGER;
ALTER TABLE repository_metadata ADD COLUMN rate_limit_remaining INTEGER;
ALTER TABLE repository_metadata ADD COLUMN rate_limit_reset_at TIMESTAMP;
