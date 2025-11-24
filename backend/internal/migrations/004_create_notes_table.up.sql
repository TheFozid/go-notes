CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    folder_id INT REFERENCES folders(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
    yjs_room_id VARCHAR(255) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#FFFFFF',
    is_trashed BOOLEAN DEFAULT FALSE,
    trashed_at TIMESTAMP,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_yjs_room ON notes(yjs_room_id);
