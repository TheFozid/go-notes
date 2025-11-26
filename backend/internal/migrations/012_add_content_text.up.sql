-- Add content_text column for searchable plain text
ALTER TABLE notes ADD COLUMN content_text TEXT;

-- Create full-text search index
CREATE INDEX idx_notes_content_text ON notes USING gin(to_tsvector('english', content_text));
