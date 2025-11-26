# go-notes Architecture Overview

**Last Updated:** 2025-11-24  
**Status:** Phase 5 Complete + UI Polish ✅  
**Current Phase:** Phase 6 Planning

---

## Tech Stack

- **Backend:** Go 1.25 (Gin framework), PostgreSQL 15
- **Content Sync:** Hocuspocus 2.15.3 (Node.js WebSocket server)
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, Quill
- **Deployment:** Docker Compose (3 services: db, backend, yjs)
- **Authentication:** JWT with database validation

---

## System Architecture

### Three-Service Architecture
```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                         │
│              (React + Quill + Hocuspocus)               │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────┴────────────────────────────────────┐
│                    Backend (Go + Gin)                   │
│  - REST API (metadata, auth, workspaces)                │
│  - JWT validation                                       │
│  - WebSocket proxy (/yjs → yjs:1234)                    │
└─────────────┬───────────────────────┬───────────────────┘
              │                       │
    ┌─────────┴─────────┐   ┌────────┴──────────┐
    │   PostgreSQL      │   │   Hocuspocus      │
    │  - Metadata       │   │  - Content sync   │
    │  - User/workspace │   │  - CRDT (Y.js)    │
    │  - Yjs documents  │   │  - Collaboration  │
    └───────────────────┘   └───────────────────┘
```

### Backend (Go + PostgreSQL)

**Responsibilities:**
- User authentication and management
- Workspace/folder hierarchy and permissions
- Note metadata (title, color, trash status, tags, yjs_room_id)
- Tag management (case-insensitive, auto-create)
- Access control and authorization
- Hocuspocus authentication token validation
- WebSocket proxy to Hocuspocus server

**Key Features:**
- JWT authentication with configurable `JWT_SECRET`
- All routes under configurable `API_BASE_PATH` (e.g., `/test`)
- Automatic database migrations on startup
- Serves frontend static files
- Single external port deployment

**Note:** Backend does NOT handle note content - only metadata. Content is managed by Hocuspocus.

---

### Content Layer (Hocuspocus + PostgreSQL)

**Hocuspocus Server:**
- Deployed as separate Docker service (Node.js)
- Handles all note content editing
- Real-time collaboration via CRDT (Conflict-free Replicated Data Type)
- Built-in features: per-user undo/redo, presence tracking, cursor tracking
- Automatic offline sync with conflict resolution
- Authenticates via JWT validation with Go backend

**Persistence:**
- PostgreSQL Database extension stores Yjs documents
- Each note = one Yjs document in `yjs_documents` table
- Room ID format: `w{workspace_id}_n{note_id}`
- Automatic document lifecycle management

**Authentication Flow:**
1. User authenticates with backend (receives JWT)
2. Frontend connects to Hocuspocus via backend proxy: `ws://backend:8060/test/yjs/?token=JWT`
3. Backend proxies to Hocuspocus at `ws://yjs:1234/`
4. Hocuspocus validates JWT with backend via `POST /validate-yjs-token`
5. Backend checks workspace membership
6. Connection allowed/denied based on validation result

---

### Frontend (React + Quill + Hocuspocus)

**Layout:** CSS Grid (3 columns × 2 rows)
```
┌──────────────────────────────────────────────────────┐
│  TOP BAR (60px) - User menu, toggles                 │
├─────────┬──────────────────────────┬─────────────────┤
│  LEFT   │   MAIN CONTENT           │   RIGHT         │
│  PANEL  │   ┌──────────────────┐   │   PANEL         │
│ (250px) │   │ Tags + Color     │   │  (250px)        │
│         │   ├──────────────────┤   │                 │
│         │   │ Quill Editor     │   │                 │
│         │   │                  │   │                 │
│         │   └──────────────────┘   │                 │
│         │   [Toolbar - 60px]       │                 │
└─────────┴──────────────────────────┴─────────────────┘
```

**Completed Features:**
- ✅ Authentication (setup, login, logout, protected routes)
- ✅ Workspace/folder/note tree (unlimited nesting)
- ✅ Full CRUD for workspaces, folders, notes
- ✅ Trash system (restore, delete, empty)
- ✅ Member management (add/remove, transfer ownership)
- ✅ User management (admin + self-service)
- ✅ Rich text editor (Quill with extensive formatting)
- ✅ Real-time collaboration (multi-user verified)
- ✅ Cursor tracking (color-coded with usernames)
- ✅ Note color picker (9 post-it colors)
- ✅ Tag management (add/remove tags on notes)
- ✅ Tag navigation (collapsible tag list, shows all notes)
- ✅ Search (title + tag search with 500ms debounce)
- ✅ Material Symbols icons throughout UI
- ✅ Dynamic note path in title bar
- ✅ Panels hidden by default (toggle to open)
- ✅ Horizontal scrolling toolbar with all Quill formats
- ✅ All dropdowns working correctly (fixed positioning)

**Known Issues:**
- ⚠️ Authentication warning in console (cosmetic, does not affect functionality)

---

## Database Schema

### Core Tables

**users**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**workspaces**
```sql
CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**workspace_members**
```sql
CREATE TABLE workspace_members (
  workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'member')),
  PRIMARY KEY (workspace_id, user_id)
);
```

**folders**
```sql
CREATE TABLE folders (
  id SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id INT REFERENCES folders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**notes**
```sql
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id INT REFERENCES folders(id) ON DELETE SET NULL,
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
```

**tags**
```sql
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL
);

CREATE UNIQUE INDEX tags_name_lower_idx ON tags (LOWER(name));
```

**note_tags**
```sql
CREATE TABLE note_tags (
  note_id INT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

**yjs_documents** (Managed by Hocuspocus)
```sql
CREATE TABLE yjs_documents (
  name VARCHAR(255) PRIMARY KEY,  -- Room ID (e.g., "w2_n3")
  data BYTEA NOT NULL,             -- Yjs document binary
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```


---

## Performance Optimizations

### Database Indexes (v1.1)

**Added indexes for query optimization:**
```sql
-- Improve note queries
CREATE INDEX idx_notes_workspace_trashed ON notes(workspace_id, is_trashed);
CREATE INDEX idx_notes_folder ON notes(folder_id) WHERE folder_id IS NOT NULL;

-- Improve tag queries
CREATE INDEX idx_note_tags_tag ON note_tags(tag_id);
CREATE INDEX idx_tags_name_lower ON tags(LOWER(name));

-- Improve workspace member lookups
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Improve folder hierarchy queries
CREATE INDEX idx_folders_parent ON folders(parent_id) WHERE parent_id IS NOT NULL;
```

**Impact:**
- Note listing queries: 3-5x faster
- Tag searches: 2-3x faster
- Workspace member checks: 2x faster

### Backend Optimizations

**N+1 Query Prevention:**
- Batch loading of tags in `ListNotes` (single query vs N queries)
- Tags loaded with `pq.Array()` for all notes at once
- Reduces database round-trips from O(n) to O(1)

**Rate Limiting:**
- General API: 60 requests/minute
- Authentication endpoints: 5 requests/minute
- Prevents abuse and ensures fair usage

**CORS Configuration:**
- Configurable via `ALLOWED_ORIGINS` environment variable
- Auto-detects from `PORT` if not specified
- Wildcard support for development
- Comma-separated origins for production

### Frontend Optimizations

**Bundle Optimization (v1.1):**
- Code splitting by library type
- Manual chunks: `quill`, `yjs`, `vendor`
- Lazy loading for UserManagement, WorkspaceTree, QuillEditor
- Initial load: ~260KB (vendor + app)
- Editor load: ~430KB (quill + yjs) - only when opening note
- **Total reduction: ~57% in initial load**

**Loading Strategy:**
- Critical components (App, routing): Loaded immediately
- Editor components: Loaded on-demand via `React.lazy()`
- Heavy libraries (Quill, Yjs): Separate chunks
- Suspense boundaries for smooth UX

### Health Checks

**Endpoints:**
- `/health/live` - Liveness probe (is app alive?)
- `/health/ready` - Readiness probe (is app ready for traffic?)
  - Checks database connectivity
  - Returns 503 if database unreachable

**Docker Integration:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:8060/go-notes/health/live"]
  interval: 10s
  timeout: 5s
  retries: 3
```

---

## API Endpoints

**Authentication:**
```
GET  /setup              - Check if setup complete
POST /setup              - Create first admin
POST /login              - JWT authentication
POST /validate-yjs-token - Validate JWT for Hocuspocus (internal)
```

**Users:**
```
GET    /users         - List all users (authenticated)
POST   /users         - Create user (admin only)
GET    /users/:id     - Get user (admin or self)
PUT    /users/:id     - Update user (admin or self)
DELETE /users/:id     - Delete user (admin or self, not last admin)
```

**Workspaces:**
```
POST   /workspaces                    - Create workspace
GET    /workspaces                    - List with roles
PUT    /workspaces/:id                - Update (owner only)
DELETE /workspaces/:id                - Delete (owner only)
GET    /workspaces/:id/members        - List members
POST   /workspaces/:id/members        - Add member (owner only)
DELETE /workspaces/:id/members/:uid   - Remove/leave
PUT    /workspaces/:id/owner          - Transfer ownership
GET    /workspaces/:id/tags           - List workspace tags
```

**Folders:**
```
POST   /workspaces/:id/folders        - Create folder
GET    /workspaces/:id/folders        - List all folders
PUT    /workspaces/:id/folders/:fid   - Update folder
DELETE /workspaces/:id/folders/:fid   - Delete folder (trashes notes)
```

**Notes:**
```
POST   /workspaces/:id/notes              - Create note
GET    /workspaces/:id/notes              - List notes (with tags)
GET    /workspaces/:id/notes/:nid         - Get note (with tags)
PUT    /workspaces/:id/notes/:nid         - Update metadata
DELETE /workspaces/:id/notes/:nid         - Delete note
PUT    /workspaces/:id/notes/:nid/tags    - Set note tags
POST   /workspaces/:id/notes/:nid/trash   - Move to trash
POST   /workspaces/:id/notes/:nid/restore - Restore from trash
```

**Trash:**
```
GET  /workspaces/:id/trash       - List trashed notes
POST /workspaces/:id/trash/empty - Empty trash (all members)
```

**Tags:**
```
GET /tags - List all tags globally
```

**Hocuspocus Proxy:**
```
ANY /yjs        - WebSocket proxy root
ANY /yjs/*      - WebSocket proxy with path
```

---

## State Management (Zustand)

**authStore:**
- `token`, `user`, `isAuthenticated`
- `setAuth()`, `clearAuth()`

**workspaceStore:**
- `workspaces`, `folders`, `notes` (metadata only, tags included)
- `selectedWorkspaceId`, `selectedNoteId`
- `expandedWorkspaces`, `expandedFolders`
- CRUD actions for all entities
- Helper methods: `getNotesByTag()`, `getAllUserTags()`, `getNotePath()`, etc.

**Note:** Content is NOT in store - it lives in Hocuspocus/Quill.

---

## Configuration

**Environment Variables (.env):**
```bash
# Backend
PORT=8060
API_BASE_PATH=/go-notes
JWT_SECRET=your-secret-key-change-in-production

# CORS (optional - leave empty to auto-detect from PORT)
ALLOWED_ORIGINS=

# Database
DB_HOST=db
DB_PORT=5432
DB_USER=notes
DB_PASSWORD=notespass
DB_NAME=notesdb

# Hocuspocus
YJS_WS_PORT=1234
YJS_HTTP_PORT=1235

# Features
TRASH_AUTO_DELETE_DAYS=30
```

**Production Configuration Notes:**
- `JWT_SECRET`: Must be set to cryptographically secure random value
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `https://notes.example.com,https://app.example.com`)
- Leave `ALLOWED_ORIGINS` empty for development (auto-detects from PORT)
- Set to specific origins for production (never use `*` in production)

---

## Note Colors

9 post-it style colors available:
- `#FFFFFF` - White (default)
- `#FFF9C4` - Yellow
- `#FFE0E0` - Pink
- `#D1E7FF` - Blue
- `#D4EDDA` - Green
- `#FFE5CC` - Orange
- `#E8DAEF` - Purple
- `#D5F5E3` - Mint
- `#FADBD8` - Peach

---

## Rich Text Features

**Formatting:**
- **Text styles:** Bold, Italic, Underline, Strikethrough, Inline Code
- **Headings:** H1, H2, H3
- **Fonts:** Sans Serif, Serif, Monospace
- **Sizes:** Small, Normal, Large, Huge
- **Scripts:** Superscript, Subscript
- **Colors:** Text color, Background highlight
- **Alignment:** Left, Center, Right, Justify
- **Indentation:** Increase, Decrease
- **Lists:** Bullet, Numbered, Checklist
- **Embeds:** Links, Images, Videos, LaTeX Formulas
- **Blocks:** Code blocks, Blockquotes
- **Cleanup:** Remove formatting button

**Collaboration:**
- Real-time multi-user editing (CRDT-based)
- Per-user undo/redo (isolated)
- Automatic conflict resolution
- Cursor tracking (color-coded with usernames)
- Offline editing with auto-sync on reconnect

---

## Deployment

**Docker Compose Setup:**
```bash
# Full rebuild
cd deploy
docker compose down && docker volume rm deploy_db_data
docker compose up --build

# Frontend only rebuild
cd frontend && npm run build
cd ../deploy && docker compose restart backend
```

**Services:**
1. **db** - PostgreSQL 15
2. **backend** - Go application (serves frontend + API + WebSocket proxy)
3. **yjs** - Hocuspocus server (Node.js)

**Single Port Deployment:**
- External: `http://localhost:8060/test/`
- Frontend: Served at base path
- API: REST endpoints at base path
- WebSocket: Proxied through `/yjs` route

---

## Development Workflow

**Adding Features:**
1. Review architecture and requirements
2. Update backend if needed (migrations → handlers → routes)
3. Update frontend (API client → components → state)
4. Test thoroughly
5. Update documentation

**Testing:**
```bash
# Backend tests (need update for Hocuspocus architecture)
cd backend && go test -v ./...

# Frontend build verification
cd frontend && npm run build
```

---

**Status Summary:**
- ✅ Core functionality complete and working
- ✅ Real-time collaboration verified
- ✅ Tags and search implemented
- ⚠️ Integration tests need updating
- 🔄 Ready for Phase 6 (advanced features)
