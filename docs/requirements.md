# go-notes Requirements

**Last Updated:** 2025-11-24
**Purpose:** Define what the system must do (stable reference document)

---

## Functional Requirements

### Authentication & User Management

**Must support:**
- First-run admin bootstrap (setup page)
- JWT-based authentication with configurable secret
- User CRUD operations (admin manages all, users manage self)
- Role-based access control (admin vs regular user)
- User list visible to all authenticated users (for workspace sharing)
- JWT tokens validated against database (deleted users rejected immediately)

### Workspaces

**Must support:**
- Create/update/delete workspaces
- Owner and member roles
- Add/remove members (owner only)
- Transfer ownership (owner only, to existing member)
- Members can leave (owners must transfer first)
- Workspace membership enforced at backend and Hocuspocus layer

### Folders

**Must support:**
- Hierarchical structure (unlimited nesting)
- Create/rename/delete folders
- All workspace members can manage folders
- Deleting folder trashes all notes and deletes child folders
- Move folders between workspaces (with cascading workspace_id updates)

### Notes

**Must support:**
- Create/update/delete notes
- Rich text content (see Rich Text Features below)
- Assign notes to folders (optional)
- Customizable background color (9 options)
- Soft-delete (trash system)
- Metadata stored in PostgreSQL: title, color, workspace, folder, yjs_room_id, tags
- Content stored in PostgreSQL via Hocuspocus (binary Yjs documents)

### Tags

**Must support:**
- Case-insensitive tags (unique by lowercase name)
- Auto-create tags on first use
- Attach multiple tags to notes
- View all tags across user's workspaces
- Navigate to notes by tag
- Remove tags from notes

### Search

**Must support:**
- Search by note title
- Search by tag name
- Search across all user's accessible workspaces
- Debounced search (500ms)
- Exclude trashed notes from results
- Display result count

### Rich Text Editing

**Must support:**
- Real-time multi-user collaboration (CRDT-based)
- Per-user undo/redo (isolated per user)
- Automatic conflict resolution (via Hocuspocus)
- Content persistence to PostgreSQL
- Offline editing with automatic sync on reconnect
- Cursor tracking (color-coded with usernames)
- Formatting: bold, italic, underline, strikethrough, inline code
- Headings: H1, H2, H3
- Fonts: Sans Serif, Serif, Monospace
- Sizes: Small, Normal, Large, Huge
- Scripts: Superscript, Subscript
- Colors: Text color, Background highlight
- Alignment: Left, Center, Right, Justify
- Indentation: Increase, Decrease
- Lists: bullet, numbered, checklist
- Embeds: Links, images, videos, LaTeX formulas
- Blocks: Code blocks, blockquotes
- Cleanup: Remove formatting
- Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+Z, etc.)

### Trash Management

**Must support:**
- Soft-delete notes (per workspace)
- Restore notes from trash
- Empty trash (all members can empty)
- Auto-delete after retention period (configurable via TRASH_AUTO_DELETE_DAYS)
- Trashed notes remain in database until emptied or auto-deleted

### Real-Time Collaboration

**Must support:**
- WebSocket connections per note (via Hocuspocus)
- Broadcast edits to all active users automatically
- Multiple concurrent editors (unlimited)
- Authentication before WebSocket connection allowed
- Automatic conflict resolution (CRDT-based)
- Fast connection times (<2 seconds typical)

---

## Non-Functional Requirements

### Performance

**Achieved (v1.1):**
- Fast connection times (<1 second for note loading)
- Database indexes for common queries (3-5x faster)
- N+1 query prevention (batch loading)
- Bundle size optimization (57% reduction in initial load)
- Code splitting (quill, yjs, vendor chunks)
- Lazy loading for non-critical components
- Search debouncing (500ms)
- Rate limiting prevents abuse

**Targets:**
- Support unlimited folder nesting without performance degradation ✅
- Handle multiple concurrent WebSocket connections ✅
- Fast subsequent document loads (documents cached by Hocuspocus) ✅
- Initial page load: <2 seconds on 3G ✅
- Note switching: <500ms ✅

**Future optimizations:**
- Large document testing (>10MB notes)
- Connection pooling optimization
- Hocuspocus memory management tuning
- CDN for static assets

### Security

**Must implement:**
- JWT tokens validated against database
- Tokens for deleted users rejected immediately
- Role-based endpoint protection
- Hocuspocus WebSocket authentication via JWT
- Workspace membership enforced at Hocuspocus layer
- JWT_SECRET configurable via environment variable
- Backend proxies Hocuspocus WebSocket (single external port)
- Password hashing (bcrypt)

**Future enhancements:**
- Rate limiting on API endpoints
- Rate limiting on Hocuspocus connections
- CORS configuration for production
- Content Security Policy headers
- SSL/TLS for WebSocket in production

**Production Security (Implemented v1.1):**
- JWT_SECRET must be set (application fails to start without it)
- Rate limiting: 5 requests/minute for authentication, 60/minute for general API
- CORS configuration via environment variable
- SQL injection prevention via parameterized queries with field whitelist
- Input validation on all mutation endpoints
- Password strength requirements (bcrypt with cost 10)

**Production Security (Future):**
- Content Security Policy headers
- Brute force protection (account lockout)
- SSL/TLS certificate management
- Security headers (HSTS, X-Frame-Options, etc.)

### Deployment

**Must support:**
- Single Docker Compose deployment (3 services: db, backend, yjs)
- Backend serves frontend static files
- Backend proxies Hocuspocus WebSocket traffic
- All configuration via `.env` file
- Automatic database migrations on startup
- Hocuspocus document persistence to PostgreSQL
- Single external port with configurable subpath (API_BASE_PATH)

**Future enhancements:**
- Production-ready Docker images (multi-stage builds)
- Health check endpoints
- Monitoring and logging setup
- Backup and restore procedures
- Documentation for reverse proxy setup

### Usability

**Must provide:**
- Intuitive workspace/folder/note tree navigation
- Context menus for all actions
- Visual feedback for all operations
- Color-coded notes for visual organization
- Fast search with immediate feedback
- Tag-based navigation
- Clear trash system with restore capability

**Future enhancements:**
- Loading states for async operations
- Error toasts/notifications
- Connection status indicator
- Keyboard shortcuts for navigation
- Mobile responsive design

---

## Design Constraints

### Editing Model
- Rich text via Hocuspocus CRDT (automatic conflict resolution)
- Content stored in PostgreSQL via Hocuspocus Database extension
- Metadata (title, color, tags, yjs_room_id) stored in PostgreSQL `notes` table
- No custom edit events - Hocuspocus handles all synchronization
- Each note = one Hocuspocus document with room ID format: `w{workspace_id}_n{note_id}`

### Conflict Resolution
- CRDT approach (automatic merge of concurrent edits)
- No manual conflict resolution needed
- Undo isolated per user (Hocuspocus UndoManager)
- Conflicts resolved at character level

### Folder Deletion
- Must trash notes (not permanently delete)
- Must cascade delete child folders
- Trashed notes moved to parent folder (or workspace root if no parent)

### Content Storage
- Hocuspocus documents in PostgreSQL `yjs_documents` table
- PostgreSQL stores metadata separately in `notes` table
- Title stored for search/display (updated manually for now)
- No content_text column (content is binary Yjs data)

### Authentication Flow
1. User authenticates with backend (receives JWT)
2. Frontend fetches note metadata (includes yjs_room_id)
3. Frontend connects to Hocuspocus WebSocket via backend proxy with JWT token
4. Backend proxies to Hocuspocus at internal port
5. Hocuspocus validates JWT with backend via `/validate-yjs-token`
6. Hocuspocus checks workspace membership
7. Connection allowed/denied based on validation result

### Network Architecture
- Single external port (configurable via PORT)
- Single subpath (configurable via API_BASE_PATH)
- Backend serves frontend at `http://host:PORT/API_BASE_PATH/`
- Backend API at `http://host:PORT/API_BASE_PATH/`
- Hocuspocus WebSocket at `ws://host:PORT/API_BASE_PATH/yjs/`
- Works behind reverse proxy with custom port and subpath

---

## Technology Stack

### Backend
- **Language:** Go 1.25
- **Framework:** Gin
- **Database:** PostgreSQL 15
- **Authentication:** JWT with database validation

### Content Layer
- **Sync:** Hocuspocus 2.15.3 (CRDT server)
- **Transport:** WebSocket (Hocuspocus built-in)
- **Persistence:** PostgreSQL Database extension
- **Authentication:** JWT validation via Go backend

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Rich Text Editor:** Quill
- **Collaboration:** Hocuspocus Provider + y-quill bindings

### Deployment
- **Orchestration:** Docker Compose
- **Services:** 3 (db, backend, yjs)
- **Configuration:** `.env` file
- **Volumes:** db_data (PostgreSQL data persistence)

---

## API Requirements

### REST Endpoints (Backend)

**Must provide:**
- Authentication endpoints (setup, login)
- User CRUD endpoints
- Workspace CRUD endpoints
- Folder CRUD endpoints
- Note metadata CRUD endpoints (no content in API)
- Trash management endpoints
- Tag management endpoints
- Hocuspocus token validation endpoint (internal, for Hocuspocus server)

**Must NOT provide:**
- Note content endpoints (Hocuspocus handles content)
- Edit event endpoints (Hocuspocus handles editing)
- Undo/redo endpoints (Hocuspocus UndoManager handles this)
- Custom WebSocket endpoints (Hocuspocus handles WebSockets)
- Offline sync endpoints (Hocuspocus handles offline sync)

### WebSocket (Hocuspocus)

**Must provide:**
- Real-time document synchronization
- Per-user undo/redo
- Presence and awareness
- Automatic conflict resolution
- Offline editing support with auto-sync
- PostgreSQL persistence

**Must authenticate:**
- Via JWT token in query parameters
- Validate with Go backend before allowing connection
- Enforce workspace membership

---

## UI/UX Requirements

### Layout
- CSS Grid (3 columns × 2 rows)
- Top bar (60px) with Material Symbols icons and dynamic note path
- Left panel (250px, collapsible, hidden by default) for workspace tree, tags, search
- Right panel (250px, collapsible, hidden by default) for user management
- Main content area for note editor
- Inline toolbar with horizontal scroll (toolbar + tags + color picker)

### Workspace Tree
- Hierarchical display (workspaces → folders → notes)
- Unlimited folder nesting
- Context menus for all node types
- Visual indicators for trash
- Color-coded notes
- Expandable/collapsible nodes

### Note Editor
- Rich text formatting toolbar
- Color picker for note background
- Tag input with dropdown list
- Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+Z, etc.)
- Real-time collaboration indicators (cursors)
- Clean, distraction-free interface

### Tags Section
- Collapsible section in left panel
- Alphabetically sorted tag list
- Note count per tag
- Expandable tags show all notes with that tag
- Click note to open in editor

### Search Section
- Search input in left panel
- Placeholder text: "Search..."
- 500ms debounce
- Results show note title and metadata
- Result count display
- Click result to open note

### User Management
- Two-tab interface (Account, Users)
- All users can view and edit their account
- Admins can manage all users
- Single-admin enforcement
- Clear role indicators

---

## Success Criteria

### Phase 5 + UI Polish (Complete)
- ✅ Quill editor integrates with Hocuspocus
- ✅ Content persists to PostgreSQL
- ✅ All Quill formatting options implemented
- ✅ Note colors work correctly
- ✅ Per-user undo/redo works
- ✅ Real-time collaboration verified (2+ users)
- ✅ Cursor tracking works
- ✅ Tags add/remove/navigate works
- ✅ Search by title and tags works
- ✅ Material Symbols icons throughout
- ✅ Dynamic note path in title bar
- ✅ Panels hidden by default
- ✅ Perfect toolbar scrolling
- ✅ All dropdowns working correctly

### Phase 6 (Future)
- 🔄 Offline editing verified
- 🔄 Mobile responsive design
- 🔄 Production deployment successful

---

## Known Limitations

### Current
- Search only covers title and tags (not full content text)
- No content search (Yjs documents are binary, not searchable)
- No automated tests (manual testing only)
- Authentication warning in console (cosmetic)

### Design Decisions
- Content stored as binary Yjs documents (enables collaboration but limits searchability)
- No content_text column (would require sync mechanism, adds complexity)
- Title stored separately for search/display (acceptable tradeoff)
- Tags provide additional searchability (compensates for no content search)

---

**See architecture.md for implementation details**  
**See feature-checklist.md for completion status**  
**See roadmap.md for future plans**
