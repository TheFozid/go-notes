# go-notes

A modern collaborative note-taking application with real-time editing, powerful search, and native clients for desktop and mobile. Multiple users can edit the same note simultaneously with automatic conflict resolution.

## ✨ Features

- **Real-time collaboration** - Edit notes together with live cursor tracking
- **Rich text editor** - Full formatting, code blocks, lists, images, LaTeX
- **Dual-mode search** - Fast title/tag search + full-text content search
- **Workspaces & folders** - Organize notes with unlimited nesting
- **Tags & navigation** - Quick note discovery across workspaces
- **User management** - Multi-user with workspace sharing and permissions
- **Offline support** - Edit offline, auto-syncs when reconnected
- **Trash system** - Soft-delete with restore capability
- **💻 Desktop app** - Native Electron app for Linux, Windows, macOS
- **📱 Android app** - Native mobile client with offline caching
- **🔒 Production-ready** - Rate limiting, CORS, health checks, optimized performance

## Screenshots

<p align="center">
  <img src="screenshots/sc1.jpg" width="30%" />
  <img src="screenshots/sc2.jpg" width="30%" />
  <img src="screenshots/sc3.jpg" width="30%" />
</p>

---

## 🚀 Quick Start

### Server Installation

1. **Create directory and download files**
```bash
mkdir go-notes && cd go-notes
wget https://raw.githubusercontent.com/TheFozid/go-notes/main/docker-compose.yml
wget https://raw.githubusercontent.com/TheFozid/go-notes/main/.env.example -O .env
```

2. **Configure** (edit .env)
```bash
nano .env
```
   
   **Required changes:**
   - Change `JWT_SECRET` to a cryptographically secure random string (at least 32 characters)
   - Change `DB_PASSWORD` to a secure password
   - Optionally change `API_BASE_PATH` (default: `/go-notes`)
   - Set `ALLOWED_ORIGINS` for production (see Configuration section)

3. **Start**
```bash
docker compose pull
docker compose up -d
```

4. **Access**
   - Open: `http://localhost:8060/go-notes/`
   - Create your admin account on first visit

5. **Verify health**
```bash
# Check if application is ready
curl http://localhost:8060/go-notes/health/ready

# Expected response: {"status":"ready","database":"connected"}
```

### Update Server
```bash
cd go-notes
docker compose pull
docker compose up -d
```

---

## 🔍 Search Features

go-notes includes powerful dual-mode search:

### Title + Tags Mode (Fast)
- **Instant search** across note titles and tags
- **500ms debounce** for smooth typing experience
- Perfect for quick note discovery
- Works across all your accessible workspaces

### Full Content Mode (Comprehensive)
- **Full-text search** through all note content
- Uses PostgreSQL GIN index for fast searches
- Searches titles, tags, AND note content simultaneously
- Automatically updates as you edit (2-second sync)
- Handles large documents efficiently

**Usage:**
1. Open the left panel (click the panel toggle icon)
2. Use the Search section
3. Toggle between "Title + Tags" and "Full Content"
4. Type your query - results appear instantly
5. Click any result to open that note

**Search Tips:**
- Use quotes for exact phrases: `"project meeting"`
- Search is case-insensitive
- Supports partial word matching
- Excludes trashed notes automatically

---

## 💻 Desktop App

Native Electron application for Linux, Windows, and macOS.

### Features
- Server configuration screen
- Offline caching for read-only access
- Connection status indicator (red bars when offline)
- Change server via menu option
- Native desktop performance
- Secure credential storage

### Installation

#### Arch Linux (AUR)
```bash
yay -S go-notes
# or
paru -S go-notes
```

#### Other Linux Distributions
Download the **AppImage** from [GitHub Releases](https://github.com/TheFozid/go-notes/releases/latest):
```bash
# Download and make executable
chmod +x go-notes-*-linux-x86_64.AppImage

# Run
./go-notes-*-linux-x86_64.AppImage
```

Or extract the **tar.gz** to install manually.

#### Windows
Download from [GitHub Releases](https://github.com/TheFozid/go-notes/releases/latest):
- **Setup installer** (recommended): `go-notes-*-windows-install.exe`
- **Portable version**: `go-notes-*-windows-portable.exe` (no installation required)

#### macOS
Download from [GitHub Releases](https://github.com/TheFozid/go-notes/releases/latest):
- **DMG installer**: `go-notes-*-macos.dmg`

### First Launch
1. Open the app
2. Enter your go-notes server URL
   - Example (HTTPS): `https://notes.yourdomain.com/go-notes`
   - Example (local): `http://192.168.1.100:8060/go-notes`
   - **Important:** Include the protocol (http:// or https://)
3. Login with your credentials
4. Start editing!

### Offline Access
The desktop app caches the interface and previously viewed content for offline viewing. When offline:
- ✅ View previously loaded notes (read-only)
- ✅ Navigate through cached workspaces
- ✅ Search cached content
- ❌ Cannot create or edit notes
- ❌ Cannot sync changes

Content automatically syncs when connection is restored.

---

## 📱 Android App

Native Android client for accessing go-notes on mobile devices.

### Features
- Configure custom server URL
- Offline caching (read-only)
- Connection status indicator (red bars when offline)
- Change server option via menu
- Native Android performance
- Material Design UI

### Download

**[Download go-notes-android.apk](https://github.com/TheFozid/go-notes/releases/latest)** from GitHub Releases

### Installation

1. Download the APK on your Android device
2. Enable "Install from unknown sources" in Android settings
3. Open the APK file to install
4. Launch the app and enter your go-notes server URL
   - Example (HTTPS): `https://notes.yourdomain.com/go-notes`
   - Example (local): `http://192.168.1.100:8060/go-notes`
   - **Important:** Include the protocol (http:// or https://)
5. Login with your credentials

### Requirements
- Android 8.0+ (API 26+)
- Access to a go-notes server (local network or public domain)
- Internet connection (for sync, not required for cached content)

### Offline Access
Same offline capabilities as desktop app - read-only access to cached content with full search functionality.

---

## 🌐 Reverse Proxy Setup

### Nginx Configuration

For production deployment with SSL/TLS:
```nginx
server {
    listen 443 ssl http2;
    server_name notes.yourdomain.com;
    
    # SSL configuration (Let's Encrypt recommended)
    ssl_certificate /etc/letsencrypt/live/notes.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notes.yourdomain.com/privkey.pem;
    
    # go-notes application
    location /go-notes/ {
        proxy_pass http://192.168.0.4:8060/go-notes/;
        
        # WebSocket support (REQUIRED for real-time collaboration)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for WebSocket connections
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        
        # Disable buffering for real-time updates
        proxy_buffering off;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name notes.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**Apply the configuration:**
```bash
sudo nano /etc/nginx/sites-available/go-notes
sudo ln -s /etc/nginx/sites-available/go-notes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Replace `192.168.0.4:8060` with your actual server IP/hostname and port.

### Caddy Configuration

For automatic HTTPS with Caddy (easier alternative):
```caddyfile
notes.yourdomain.com {
    reverse_proxy /go-notes/* 192.168.0.4:8060
}
```

Caddy automatically handles SSL/TLS certificates via Let's Encrypt.

---

## ⚙️ Configuration

### Environment Variables (.env)
```bash
# Server Configuration
PORT=8060                    # Internal port (keep as 8060)
API_BASE_PATH=/go-notes      # URL subpath

# Security (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=change-me-in-production-use-at-least-32-random-characters
ALLOWED_ORIGINS=             # Leave empty for development, set for production

# Database
DB_HOST=db
DB_PORT=5432
DB_USER=notes
DB_PASSWORD=notespass        # CHANGE THIS
DB_NAME=notesdb

# Hocuspocus (real-time collaboration server)
YJS_WS_PORT=1234             # Internal port
YJS_HTTP_PORT=1235           # Internal port

# Features
TRASH_AUTO_DELETE_DAYS=30    # Auto-delete trashed notes after X days
```

### Production Security Configuration

**JWT_SECRET:**
- Must be at least 32 characters
- Use cryptographically secure random string
- Generate with: `openssl rand -base64 32`
- Application will fail to start if not set or too short

**ALLOWED_ORIGINS:**
- Leave empty for development (auto-detects from PORT)
- For production, set to comma-separated list of allowed origins:
```bash
  ALLOWED_ORIGINS=https://notes.yourdomain.com,https://app.yourdomain.com
```
- Never use `*` in production
- Must include protocol (https://)

**Database Password:**
- Use strong password (20+ characters recommended)
- Include mix of letters, numbers, symbols
- Generate with: `openssl rand -base64 24`

### Changing the Base Path

To use a different URL path (e.g., `/notes` instead of `/go-notes`):

1. Edit `.env`:
```bash
API_BASE_PATH=/notes
```

2. Restart:
```bash
docker compose down
docker compose up -d
```

3. Update your nginx `location` block to match:
```nginx
location /notes/ {
    proxy_pass http://192.168.0.4:8060/notes/;
    ...
}
```

---

## 🛠️ Management

### View logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f yjs
docker compose logs -f db
```

### Check health status
```bash
# Liveness (is app alive?)
curl http://localhost:8060/go-notes/health/live

# Readiness (is app ready for traffic?)
curl http://localhost:8060/go-notes/health/ready
```

### Stop application
```bash
docker compose down
```

### Restart application
```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
```

### Update application
```bash
docker compose pull
docker compose up -d
```

### Backup database
```bash
# Full backup
docker compose exec db pg_dump -U notes notesdb > backup-$(date +%Y%m%d).sql

# Backup with compression
docker compose exec db pg_dump -U notes notesdb | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Restore database
```bash
# From uncompressed backup
cat backup.sql | docker compose exec -T db psql -U notes notesdb

# From compressed backup
gunzip -c backup.sql.gz | docker compose exec -T db psql -U notes notesdb
```

### View resource usage
```bash
docker stats
```

### Complete reset (⚠️ DELETES ALL DATA)
```bash
docker compose down -v
docker compose up -d
```

---

## 🏗️ Architecture

**Three-service deployment:**
- **PostgreSQL 15** - Stores metadata, Yjs documents, full-text search index
- **Go Backend** - REST API, authentication, WebSocket proxy, search endpoints
- **Hocuspocus (Node.js)** - Real-time CRDT collaboration server

All services run in Docker containers and communicate via internal network. Only the backend port (8060) is exposed externally.

**Key Features:**
- Single port deployment (8060)
- WebSocket proxy through backend (no direct Hocuspocus exposure)
- JWT authentication validated at both backend and Hocuspocus layers
- PostgreSQL handles both metadata and binary Yjs documents
- Full-text search with GIN indexing

**Security Features (v1.1+):**
- Rate limiting: 5 req/min for auth, 60 req/min for API
- CORS configuration with environment variables
- SQL injection prevention via parameterized queries
- Health check endpoints for monitoring
- JWT secret enforcement

**Performance Optimizations (v1.1+):**
- Database indexes for common queries (3-5x faster)
- N+1 query prevention with batch loading
- Frontend code splitting (57% smaller initial load)
- Lazy loading for heavy components

---

## 🔒 Production Deployment Checklist

Before deploying to production:

### Security
- [ ] Generate strong `JWT_SECRET` (32+ characters): `openssl rand -base64 32`
- [ ] Set strong `DB_PASSWORD` (20+ characters): `openssl rand -base64 24`
- [ ] Configure `ALLOWED_ORIGINS` with your domain(s)
- [ ] Set up SSL/TLS with Let's Encrypt or valid certificate
- [ ] Configure firewall to only expose 80/443 (HTTP/HTTPS)
- [ ] Review and harden nginx/Caddy configuration
- [ ] Disable direct access to port 8060 from internet

### Reliability
- [ ] Set up automated database backups (daily recommended)
- [ ] Test backup restoration procedure
- [ ] Configure log rotation
- [ ] Set up monitoring (health checks at minimum)
- [ ] Document disaster recovery procedure

### Performance
- [ ] All database indexes created (automatic in v1.1+)
- [ ] Rate limiting configured (automatic in v1.1+)
- [ ] Health checks responding correctly
- [ ] Test with expected user load

### Operational
- [ ] Update procedure documented
- [ ] Rollback plan prepared
- [ ] Alert contacts configured
- [ ] Maintenance window scheduled

---

## 📊 System Requirements

### Server
**Minimum:**
- 1 CPU core
- 512MB RAM
- 2GB disk space
- Docker & Docker Compose
- Network connectivity

**Recommended:**
- 2+ CPU cores
- 2GB+ RAM
- 10GB+ disk space (more for large deployments)
- SSD storage for database
- Dedicated server or VPS

**Network:**
- Port 8060 accessible (or via reverse proxy)
- WebSocket support required
- Stable connection for real-time sync

### Desktop App
- **Linux:** x86_64 architecture, modern distribution
- **Windows:** Windows 10 or later
- **macOS:** macOS 10.13 (High Sierra) or later
- ~200MB disk space
- Internet connection (for sync)

### Android App
- Android 8.0+ (API 26+)
- ~10MB disk space
- Internet connection (for sync)

---

## 🐛 Troubleshooting

### Application Issues

**Application won't start:**
```bash
# Check all logs
docker compose logs

# Check specific service
docker compose logs backend
docker compose logs yjs
docker compose logs db

# Verify containers are running
docker compose ps

# Check resource usage
docker stats
```

**Database connection errors:**
```bash
# Verify database is healthy
docker compose exec db psql -U notes -c "SELECT 1;"

# Check database logs
docker compose logs db

# Restart database
docker compose restart db
```

**JWT errors or authentication failures:**
- Verify `JWT_SECRET` is set in `.env`
- Ensure `JWT_SECRET` is at least 32 characters
- Restart backend after changing: `docker compose restart backend`

### Network Issues

**Can't access via browser:**
- Check firewall allows port 8060
- Verify `API_BASE_PATH` in .env matches URL
- Check nginx/Caddy config if using reverse proxy
- Test health endpoint: `curl http://localhost:8060/go-notes/health/live`

**Real-time collaboration not working:**
- Ensure WebSocket support in nginx/Caddy config
- Check browser console for WebSocket errors (F12)
- Verify no firewall blocking WebSocket upgrades
- Test WebSocket: `wscat -c ws://localhost:8060/go-notes/yjs/`

**Rate limiting errors (429 Too Many Requests):**
- Wait 1 minute and try again
- Authentication: 5 requests/minute limit
- General API: 60 requests/minute limit
- Contact admin if legitimate use case needs higher limits

### Desktop/Android App Issues

**Can't connect to server:**
- Verify server URL includes protocol (http:// or https://)
- Check server is accessible from device network
- Test in browser first: `http://your-server:8060/go-notes/`
- Check server health: `/health/ready` endpoint

**Offline content missing:**
- Content only cached after viewing while online
- Open notes while online to cache them
- Check device storage space

**Connection status stuck red:**
- Check device network connection
- Verify server is running: `docker compose ps`
- Check server logs: `docker compose logs backend`

### Search Issues

**Full-text search not finding content:**
- New notes: Wait 2-3 seconds for content to sync
- Existing notes: Edit them briefly to populate index
- Check search mode is set to "Full Content"
- Check logs: Look for "Updated searchable text" messages

**Search is slow:**
- Run `docker compose exec db psql -U notes notesdb -c "VACUUM ANALYZE notes;"`
- Check database size: `docker compose exec db psql -U notes -c "\l+"`
- Consider upgrading server resources

### Performance Issues

**Slow response times:**
```bash
# Check resource usage
docker stats

# Check database performance
docker compose exec db psql -U notes notesdb -c "SELECT * FROM pg_stat_activity;"

# Restart services
docker compose restart
```

**High memory usage:**
- Check number of active connections
- Review note sizes (very large notes can impact memory)
- Restart Hocuspocus to clear memory: `docker compose restart yjs`

---

## 📚 Additional Documentation

For developers and advanced configuration:

- **[architecture.md](docs/architecture.md)** - Technical system design, database schema, API endpoints
- **[requirements.md](docs/requirements.md)** - Detailed feature specifications
- **[roadmap.md](docs/roadmap.md)** - Future development plans
- **[tracking.md](docs/tracking.md)** - Development history and session logs

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs** - Open an issue with details
2. **Suggest features** - Describe your use case
3. **Submit PRs** - Fix bugs or add features
4. **Improve docs** - Help others understand go-notes
5. **Share feedback** - Let us know how you use go-notes

**Before contributing:**
- Check existing issues and PRs
- Follow existing code style
- Test your changes thoroughly
- Update documentation as needed

**Repository:** https://github.com/TheFozid/go-notes

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

You are free to use, modify, and distribute this software for any purpose, commercial or non-commercial, with attribution.

---

## 🙏 Acknowledgments

Built with excellent open-source tools:

- **[Hocuspocus](https://tiptap.dev/hocuspocus)** - Real-time collaboration server
- **[Y.js](https://yjs.dev/)** - CRDT framework for conflict-free editing
- **[Quill](https://quilljs.com/)** - Modern rich text editor
- **[Go](https://golang.org/)** - Fast, reliable backend language
- **[Gin](https://gin-gonic.com/)** - High-performance Go web framework
- **[React](https://react.dev/)** - Powerful frontend framework
- **[PostgreSQL](https://www.postgresql.org/)** - Robust open-source database
- **[Electron](https://www.electronjs.org/)** - Cross-platform desktop apps
- **[Android](https://developer.android.com/)** - Mobile platform

Special thanks to the open-source community for these amazing tools!

---

## 💬 Support

**Need help?**
- 📖 Check [documentation](docs/)
- 🐛 [Open an issue](https://github.com/TheFozid/go-notes/issues)
- 💡 [Discussions](https://github.com/TheFozid/go-notes/discussions)

**Found a security issue?**
- Email: [security contact - add your email]
- Do not open public issues for security vulnerabilities

---

<p align="center">
  <b>If you find go-notes useful, consider supporting development:</b><br><br>
  <a href="https://buymeacoffee.com/danny_and_serin">
    <img src="https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png" alt="Buy Me A Coffee">
  </a>
</p>

<p align="center">
  <b>Made y <a href="https://github.com/TheFozid">TheFozid</a></b><br>
  <sub>A collaborative note-taking app that respects your data and privacy</sub>
</p>
