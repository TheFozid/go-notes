# go-notes Roadmap

**Last Updated:** 2025-11-24
**Purpose:** Future development plans and phases

---

## Current Status

✅ **Phases 0-5 + UI Polish:** Complete  
🎯 **Current Focus:** Planning Phase 6  
📋 **Next Milestone:** Advanced Features

---

## Phase 6: Advanced Features

**Goal:** Enhance user experience with power-user features

**Status:** 🔄 Planning

### Title Synchronization
**Priority:** High  
**Estimated Time:** 1 session (~2-3 hours)

- [ ] Extract title from Quill content (first line or first heading)
- [ ] Update PostgreSQL title on content change
- [ ] Debounced updates to reduce DB writes (e.g., every 2 seconds)
- [ ] Handle empty titles gracefully (default to "Untitled")
- [ ] Show updated title in note list immediately
- [ ] Backend endpoint for title extraction (if needed)

**Benefits:** Eliminates manual title updates, improves UX

---

### Tag Enhancements
**Priority:** Medium  
**Estimated Time:** 2-3 sessions (~6-9 hours)

- [ ] Tag autocomplete (suggest existing tags when typing)
- [ ] Tag filtering in note list (click tag to filter)
- [ ] Tag cloud visualization (size based on usage)
- [ ] Bulk tag operations (add/remove tag to multiple notes)
- [ ] Tag renaming (update all notes with that tag)
- [ ] Tag deletion (remove from all notes, with confirmation)
- [ ] Tag color coding (optional enhancement)

**Benefits:** Improved tag management workflow

---

### Search Enhancements
**Priority:** Medium  
**Estimated Time:** 2-3 sessions (~6-9 hours)

- [ ] Highlight search terms in results
- [ ] Recent searches history (last 10 searches)
- [ ] Search within current workspace only (toggle)
- [ ] Search within current folder only (toggle)
- [ ] Keyboard shortcut (Ctrl+K or Cmd+K for quick search)
- [ ] Advanced filters (by color, by date, by folder)
- [ ] Search result preview (first few lines of content)

**Benefits:** Faster note discovery, better search UX

**Note:** Full-text content search is not planned due to binary Yjs document storage. Title + tag search provides good coverage.

---

### Mobile Responsive Design
**Priority:** Low  
**Estimated Time:** 3-4 sessions (~9-12 hours)

- [ ] Responsive breakpoints (mobile <768px, tablet 768-1024px, desktop >1024px)
- [ ] Touch-friendly UI (larger tap targets, swipe gestures)
- [ ] Mobile menu system (hamburger menu, collapsible panels)
- [ ] Mobile-optimized editor toolbar
- [ ] PWA support for offline access
- [ ] Test on iOS and Android devices

**Benefits:** Usable on mobile devices

---

## Phase 7: Production Readiness

**Goal:** Prepare for production deployment

**Status:** 📋 Planned

### Documentation
**Priority:** High  
**Estimated Time:** 2-3 sessions (~6-9 hours)

- [ ] User guide with screenshots (getting started, features, tips)
- [ ] API documentation (OpenAPI/Swagger spec)
- [ ] Production deployment guide (Docker, reverse proxy, SSL)
- [ ] Security best practices (JWT secrets, CORS, rate limiting)
- [ ] Backup and restore procedures
- [ ] Troubleshooting guide (common issues and solutions)
- [ ] Developer guide (architecture, contributing, testing)

---

### Deployment Enhancements
**Priority:** High  
**Estimated Time:** 2-3 sessions (~6-9 hours)

- [ ] Multi-stage Docker builds (reduce image sizes)
- [ ] Health check endpoints for all services
- [ ] SSL/TLS setup guide (Let's Encrypt, Caddy)
- [ ] Reverse proxy examples (Nginx, Caddy, Traefik)
- [ ] Environment variable documentation
- [ ] Production `.env` template
- [ ] Monitoring setup guide (Prometheus, Grafana)
- [ ] Logging best practices
- [ ] Automated PostgreSQL backups

---

### Security Audit
**Priority:** Medium  
**Estimated Time:** 1-2 sessions (~3-6 hours)

- [ ] Rate limiting on API endpoints
- [ ] Rate limiting on Hocuspocus connections
- [ ] CORS configuration for production
- [ ] Content Security Policy headers
- [ ] Dependency vulnerability scanning (npm audit, Go modules)
- [ ] JWT token expiration policy review
- [ ] Password strength requirements
- [ ] Session management review
- [ ] Basic penetration testing

---

## Phase 8: Testing & Quality

**Goal:** Comprehensive automated testing

**Status:** 📋 Planned

### Backend Testing
**Priority:** High  
**Estimated Time:** 2-3 sessions (~6-9 hours)

- [ ] Update integration tests for Hocuspocus architecture
- [ ] Remove tests for deprecated features
- [ ] Add tests for `/validate-yjs-token` endpoint
- [ ] Test yjs_room_id generation
- [ ] Test workspace membership enforcement
- [ ] Test note metadata CRUD with tags
- [ ] Test trash system
- [ ] Ensure tests run in clean Docker environment

**Target:** 15-20 integration tests covering core functionality

---

### Frontend Testing
**Priority:** Medium  
**Estimated Time:** 2-3 sessions (~6-9 hours)

- [ ] Component tests (React Testing Library)
- [ ] Test workspace tree interactions
- [ ] Test note editor functionality
- [ ] Test tag management
- [ ] Test search functionality
- [ ] Test authentication flows
- [ ] Test error handling

---

### End-to-End Testing
**Priority:** Medium  
**Estimated Time:** 2-3 sessions (~6-9 hours)

- [ ] Setup Playwright or Cypress
- [ ] Test complete user workflows
- [ ] Test multi-user collaboration scenarios
- [ ] Test offline editing and sync
- [ ] Performance testing (large documents, many notes)
- [ ] Cross-browser testing

---

## Phase 9: CI/CD & GitHub

**Goal:** Automated workflows and public repository

**Status:** 📋 Planned

### GitHub Setup
**Priority:** High  
**Estimated Time:** 1-2 sessions (~3-6 hours)

- [ ] Migrate repository to GitHub (public or private)
- [ ] Setup GitHub Actions for CI/CD
- [ ] Automated build pipeline (on push, on PR)
- [ ] Automated test runs on PR
- [ ] Linting and code quality checks (golangci-lint, ESLint)
- [ ] Docker image building and publishing
- [ ] Semantic versioning strategy

---

### Release Management
**Priority:** Medium  
**Estimated Time:** 1 session (~2-3 hours)

- [ ] Semantic versioning (major.minor.patch)
- [ ] Automated changelog generation
- [ ] GitHub Releases with binaries
- [ ] Docker image publishing (Docker Hub or GitHub Container Registry)
- [ ] Version tagging strategy
- [ ] Release notes template

---

### Project Management
**Priority:** Low  
**Estimated Time:** 1 session (~2-3 hours)

- [ ] GitHub Projects for task tracking
- [ ] Milestones for release planning
- [ ] Issue templates (bug report, feature request)
- [ ] Pull request templates
- [ ] Contributing guidelines (CONTRIBUTING.md)
- [ ] Code of conduct (CODE_OF_CONDUCT.md)

---

## Phase 10: Mobile Applications (Optional)

**Goal:** Native mobile apps with feature parity

**Status:** 📋 Long-term

### Android Application
**Priority:** Future  
**Estimated Time:** 10+ sessions (major project)

- [ ] Native Android app (Kotlin)
- [ ] Feature parity with web app
- [ ] Local offline storage
- [ ] JWT authentication integration
- [ ] Real-time collaboration via Hocuspocus
- [ ] Offline editing with sync
- [ ] Push notifications
- [ ] Google Play Store deployment

---

### iOS Application
**Priority:** Future  
**Estimated Time:** 10+ sessions (major project)

- [ ] Native iOS app (Swift)
- [ ] Feature parity with Android
- [ ] App Store deployment

---

## Timeline Estimates

**Phase 6 (Advanced Features):** 4-6 sessions (~12-18 hours)  
**Phase 7 (Production):** 4-6 sessions (~12-18 hours)  
**Phase 8 (Testing):** 4-6 sessions (~12-18 hours)  
**Phase 9 (CI/CD):** 2-3 sessions (~6-9 hours)  
**Phase 10 (Mobile):** 20+ sessions (major undertaking)

**Total for Phases 6-9:** ~14-21 sessions (~42-63 hours)

---

## Development Principles

1. **Incremental Progress** - One phase at a time, fully tested
2. **User Feedback** - Gather feedback after each phase
3. **Quality Over Speed** - Get it right before moving on
4. **Documentation First** - Document as you build
5. **Test Everything** - No feature is complete without tests
6. **Battle-Tested Libraries** - Use proven solutions
7. **Keep It Simple** - Avoid over-engineering
8. **Maintain Backwards Compatibility** - Don't break existing functionality

---

## Priority System

**High Priority:**
- Features that significantly improve UX
- Security and stability improvements
- Production readiness items
- Documentation

**Medium Priority:**
- Nice-to-have features
- Performance optimizations
- Additional testing

**Low Priority:**
- Edge case features
- Mobile applications
- Advanced customization options

---

## Decision Points

### Content Search
**Decision:** Not implementing full-text content search  
**Reason:** Yjs documents are binary CRDT data, not easily searchable  
**Alternative:** Title + tag search provides good coverage  
**Future:** Could add content_text column if demand is high (requires sync mechanism)

### Mobile Apps
**Decision:** Web-first, native apps optional  
**Reason:** PWA provides good mobile experience  
**Future:** Native apps if user demand is high

### Real-time Features
**Decision:** Use Hocuspocus for all real-time needs  
**Reason:** Battle-tested, handles complexity, reduces custom code  
**Future:** Continue leveraging Hocuspocus features (awareness, presence, etc.)

---

**Current Milestone:** Phase 6 Planning  
**Next Milestone:** Title Synchronization Implementation  
**Long-term Goal:** Production-ready collaborative note-taking application
