-- Improve search performance
CREATE INDEX idx_notes_workspace_trashed ON notes(workspace_id, is_trashed);
CREATE INDEX idx_notes_folder ON notes(folder_id) WHERE folder_id IS NOT NULL;

-- Improve tag searches
CREATE INDEX idx_note_tags_tag ON note_tags(tag_id);
CREATE INDEX idx_tags_name_lower ON tags(LOWER(name));

-- Improve workspace member lookups
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Improve folder hierarchy queries
CREATE INDEX idx_folders_parent ON folders(parent_id) WHERE parent_id IS NOT NULL;
