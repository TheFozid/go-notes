# go-notes

A modern, collaborative note-taking application with real-time editing capabilities. Built with Go, React, and Hocuspocus for seamless multi-user collaboration.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-1.25-blue.svg)
![Node Version](https://img.shields.io/badge/node-20-green.svg)

## ✨ Features

### 📝 Rich Text Editing
- **Full Quill editor** with extensive formatting options
- Headings, lists, code blocks, blockquotes
- Text colours and background highlights
- Links, images, videos, and LaTeX formulas
- Inline code and code blocks with syntax highlighting

### 🤝 Real-Time Collaboration
- **Multi-user editing** - Multiple people can edit the same note simultaneously
- **Cursor tracking** - See where others are typing with colour-coded cursors
- **Per-user undo/redo** - Your undo history is isolated from others
- **CRDT-based** - Automatic conflict resolution with Y.js
- **Offline support** - Edit offline, auto-syncs when reconnected

### 🗂️ Organization
- **Workspaces** - Separate spaces for different projects or teams
- **Unlimited folder nesting** - Organize notes hierarchically
- **Tags** - Cross-workspace categorization with tag navigation
- **Search** - Fast search across note titles and tags
- **Colour-coded notes** - 9 post-it style colours for visual organization

### 👥 User & Access Management
- **Multi-user support** - Admin and regular user roles
- **Workspace sharing** - Invite members to collaborate
- **Ownership transfer** - Transfer workspace ownership to other members
- **Self-service** - Users can manage their own accounts

### 🗑️ Trash & Safety
- **Soft-delete** - Deleted notes go to trash first
- **Restore capability** - Recover accidentally deleted notes
- **Auto-cleanup** - Configurable auto-delete after retention period
- **Empty trash** - Permanently delete when ready

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/TheFozid/go-notes.git
   cd go-notes
```

2. **Configure environment** (optional)
```bash
   cp deploy/.env.example deploy/.env
   # Edit deploy/.env if you want to change defaults
```

3. **Start the application**
```bash
   cd deploy
   docker compose up --build
```

4. **Access the application**
   - Open your browser to: http://localhost:8060/test/
   - Create your admin account on first run

### Default Configuration
- **Port:** 8060
- **Base Path:** /test
- **Database:** PostgreSQL 15
- **Auto-trash retention:** 30 days

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Go 1.25 with Gin framework
- PostgreSQL 15 for metadata storage
- JWT authentication with database validation

**Real-Time Layer:**
- Hocuspocus 2.15.3 (Node.js WebSocket server)
- Y.js CRDT for conflict-free collaborative editing
- PostgreSQL persistence for Yjs documents

**Frontend:**
- React 18 with TypeScript
- Vite build system
- Tailwind CSS for styling
- Zustand for state management
- Quill for rich text editing

### System Architecture
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

### Three-Service Deployment
1. **db** - PostgreSQL database
2. **backend** - Go API server (serves frontend + proxies WebSocket)
3. **yjs** - Hocuspocus collaboration server

All services orchestrated via Docker Compose with a single external port.

## 🔧 Configuration

### Environment Variables

Create a `deploy/.env` file:
```bash
# Backend
PORT=8060
API_BASE_PATH=/test
JWT_SECRET=your-secret-key-change-in-production

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

### Changing the Base Path

If deploying behind a reverse proxy at a different path:

1. Update `API_BASE_PATH` in `.env`
2. Rebuild: `docker compose up --build`

Example: For `/notes/` instead of `/test/`:
```bash
API_BASE_PATH=/notes
```

## 📚 Documentation

Comprehensive documentation available in the `docs/` directory:

- **[architecture.md](docs/architecture.md)** - System design and technical details
- **[requirements.md](docs/requirements.md)** - Functional and non-functional requirements
- **[feature-checklist.md](docs/feature-checklist.md)** - Feature implementation status
- **[roadmap.md](docs/roadmap.md)** - Future development plans
- **[tracking.md](docs/tracking.md)** - Development history and session log

## 🛠️ Development

### Project Structure
```
go-notes/
├── backend/              # Go backend
│   ├── cmd/             # Main application
│   ├── internal/        # Internal packages
│   │   ├── auth/        # JWT authentication
│   │   ├── db/          # Database layer
│   │   └── migrations/  # SQL migrations
│   └── Dockerfile
├── frontend/            # React frontend
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── store/      # Zustand state
│   │   └── utils/      # Utilities
│   └── package.json
├── yjs-server/          # Hocuspocus server
│   ├── server.js
│   ├── auth.js
│   ├── createDefaultContent.js
│   └── package.json
├── deploy/              # Docker Compose
│   ├── docker-compose.yml
│   └── .env
└── docs/                # Documentation
```

### Local Development

**Backend:**
```bash
cd backend
go run cmd/main.go
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Yjs Server:**
```bash
cd yjs-server
npm install
node server.js
```

### Building

**Frontend only:**
```bash
cd frontend
npm run build
# Output goes to backend/static/
```

**Full rebuild:**
```bash
cd deploy
docker compose down
docker compose up --build
```

**Clean rebuild (fresh database):**
```bash
cd deploy
docker compose down
docker volume rm deploy_db_data
docker compose up --build
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] User creation and authentication
- [ ] Workspace/folder/note CRUD operations
- [ ] Real-time collaboration (2+ users)
- [ ] Cursor tracking and awareness
- [ ] Per-user undo/redo
- [ ] Tag management and navigation
- [ ] Search functionality
- [ ] Trash and restore
- [ ] Offline editing and sync

### Automated Tests

Integration tests need updating for Hocuspocus architecture:
```bash
cd backend
go test -v ./...
```

## 🚢 Deployment

### Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use strong database credentials
- [ ] Set up SSL/TLS termination (reverse proxy)
- [ ] Configure CORS appropriately
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Configure log aggregation
- [ ] Set up monitoring and health checks

### Reverse Proxy Example (Nginx)
```nginx
location /notes/ {
    proxy_pass http://localhost:8060/test/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hocuspocus** - Real-time collaboration framework
- **Quill** - Rich text editor
- **Y.js** - CRDT framework for conflict-free editing
- **Gin** - Go web framework
- **Vite** - Fast frontend build tool

## 📞 Support

- **Issues:** https://github.com/TheFozid/go-notes/issues
- **Discussions:** https://github.com/TheFozid/go-notes/discussions

## 🗺️ Roadmap

See [docs/roadmap.md](docs/roadmap.md) for planned features and future development.

**Upcoming features:**
- Title auto-extraction from content
- Tag autocomplete and filtering
- Mobile responsive design
- Advanced search with filters
- Keyboard shortcuts
- Export functionality (PDF/Markdown)

---
