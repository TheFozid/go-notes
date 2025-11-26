-- Drop index first
DROP INDEX IF EXISTS idx_notes_content_text;

-- Drop column
ALTER TABLE notes DROP COLUMN content_text;
