import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkSetup } from './api/auth';
import useAuthStore from './store/authStore';
import useWorkspaceStore from './store/workspaceStore';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import WorkspaceTree from './components/WorkspaceTree';
import QuillEditor from './components/QuillEditor';
import SettingsModal from './components/SettingsModal';
import UserMenu from './components/UserMenu';
import DialogHost from './components/DialogHost';
import { useIsMobile } from './hooks/useMediaQuery';
import { useConnectionStore, CONNECTION_LABELS } from './store/connectionStore';
import { useUIStore, clampSidebarWidth, SIDEBAR_MIN, SIDEBAR_MAX } from './store/uiStore';
import { getWorkspaces, getFolders, getNotes } from './api/workspaces';

const LAST_NOTE_KEY = 'go-notes-last-selected-note';
const SIDEBAR_KEY_STEP = 16;

// Main app layout
function MainApp() {
  const isMobile = useIsMobile();

  const [isResizing, setIsResizing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const dragStart = useRef<{ x: number; width: number } | null>(null);

  const desktopSidebarOpen = useUIStore((state) => state.desktopSidebarOpen);
  const mobileSidebarOpen = useUIStore((state) => state.mobileSidebarOpen);
  const sidebarWidth = useUIStore((state) => state.sidebarWidth);
  const toggleDesktopSidebar = useUIStore((state) => state.toggleDesktopSidebar);
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar);
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth);
  const persistSidebarWidth = useUIStore((state) => state.persistSidebarWidth);

  const clearAuth = useAuthStore((state) => state.clearAuth);
  const selectedNoteId = useWorkspaceStore((state) => state.selectedNoteId);
  const connectionStatus = useConnectionStore((state) => state.status);
  const getNotePath = useWorkspaceStore((state) => state.getNotePath);
  const { setWorkspaces, setFolders, setNotes, setSelectedNote, toggleWorkspace, toggleFolder } = useWorkspaceStore();

  const sidebarOpen = isMobile ? mobileSidebarOpen : desktopSidebarOpen;

  function toggleSidebar() {
    if (isMobile) toggleMobileSidebar();
    else toggleDesktopSidebar();
  }

  // On phones, picking a note closes the drawer so the editor is visible
  useEffect(() => {
    if (isMobile) closeMobileSidebar();
  }, [selectedNoteId, isMobile, closeMobileSidebar]);

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!isMobile || !mobileSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileSidebar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, mobileSidebarOpen, closeMobileSidebar]);

  // Sidebar resizing. Pointer events cover mouse, touch and pen; pointer
  // capture keeps the drag going when the pointer leaves the handle.
  function onResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, width: sidebarWidth };
    setIsResizing(true);
  }

  function onResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    setSidebarWidth(dragStart.current.width + e.clientX - dragStart.current.x);
  }

  function endResize(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    dragStart.current = null;
    setIsResizing(false);
    persistSidebarWidth();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function onResizeKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth(clampSidebarWidth(sidebarWidth - SIDEBAR_KEY_STEP));
      persistSidebarWidth();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth(clampSidebarWidth(sidebarWidth + SIDEBAR_KEY_STEP));
      persistSidebarWidth();
    }
  }

  // Load data and restore last note on mount
  useEffect(() => {
    async function loadAndRestore() {
      try {
        // Load all data
        // Guarded like folders and notes below: a Go handler returning a nil
        // slice sends null, which would crash the workspace tree
        const fetched = await getWorkspaces();
        const workspacesData = Array.isArray(fetched) ? fetched : [];
        setWorkspaces(workspacesData);

        const allFolders: any[] = [];
        const allNotes: any[] = [];

        for (const ws of workspacesData) {
          const [folders, notes] = await Promise.all([
            getFolders(ws.id),
            getNotes(ws.id),
          ]);

          if (folders && Array.isArray(folders)) {
            allFolders.push(...folders);
          }
          if (notes && Array.isArray(notes)) {
            allNotes.push(...notes);
          }
        }

        setFolders(allFolders);
        setNotes(allNotes);
        setDataLoaded(true);

        // Restore last selected note
        const lastNoteId = localStorage.getItem(LAST_NOTE_KEY);

        if (lastNoteId) {
          const noteId = parseInt(lastNoteId, 10);
          const note = allNotes.find(n => n.id === noteId && !n.is_trashed);

          if (note) {
            console.log('[MainApp] Restoring note:', note);

            // Expand the workspace
            toggleWorkspace(note.workspace_id);

            // Expand all parent folders
            if (note.folder_id) {
              const expandFolderHierarchy = (folderId: number) => {
                const folder = allFolders.find(f => f.id === folderId);
                if (folder) {
                  toggleFolder(folder.id);
                  if (folder.parent_id) {
                    expandFolderHierarchy(folder.parent_id);
                  }
                }
              };
              expandFolderHierarchy(note.folder_id);
            }

            // Select the note immediately
            setSelectedNote(noteId);
            console.log('[MainApp] Note restored:', noteId);
          } else {
            console.log('[MainApp] Note no longer exists, clearing');
            localStorage.removeItem(LAST_NOTE_KEY);
          }
        }
      } catch (error) {
        console.error('[MainApp] Failed to load data:', error);
      }
    }

    loadAndRestore();
  }, []);

  // Save last selected note to localStorage
  useEffect(() => {
    if (selectedNoteId !== null && dataLoaded) {
      localStorage.setItem(LAST_NOTE_KEY, selectedNoteId.toString());
      console.log('[MainApp] Saved last note:', selectedNoteId);
    }
  }, [selectedNoteId, dataLoaded]);

  const handleLogout = () => {
    clearAuth();
    const baseTag = document.querySelector('base');
    const basename = baseTag?.getAttribute('href')?.replace(/\/$/, '') || '';
    window.location.href = basename + '/login';
  };

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const allPathParts = selectedNoteId ? getNotePath(selectedNoteId).split(' > ') : [];
  // Phones only have room for the note title
  const pathParts = isMobile ? allPathParts.slice(-1) : allPathParts;

  const sidebarClass = [
    'sidebar',
    isMobile ? 'sidebar--mobile' : '',
    isMobile && mobileSidebarOpen ? 'is-open' : '',
    !isMobile && !desktopSidebarOpen ? 'sidebar--hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`app-shell${isResizing ? ' is-resizing' : ''}`}>
      {/* Top bar */}
      <header className="topbar">
        <button
          className="icon-btn"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <span className="material-symbols-outlined">
            {isMobile ? 'menu' : sidebarOpen ? 'left_panel_close' : 'left_panel_open'}
          </span>
        </button>

        {pathParts.length > 0 ? (
          <nav className="breadcrumb" aria-label="Note location">
            {pathParts.map((part, index) => {
              const isLast = index === pathParts.length - 1;
              return (
                <span key={index} className="breadcrumb-item">
                  <span className={`breadcrumb-part${isLast ? ' breadcrumb-part--current' : ''}`}>
                    {part}
                  </span>
                  {!isLast && (
                    <span className="material-symbols-outlined breadcrumb-sep" aria-hidden="true">
                      chevron_right
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        ) : (
          <div className="app-title">go-notes</div>
        )}

        {connectionStatus !== 'idle' && (
          <span
            className={`conn-status conn-status--${connectionStatus}`}
            title={CONNECTION_LABELS[connectionStatus]}
          >
            <span className="conn-dot" aria-hidden="true" />
            {/* Label is desktop-only; the dot alone carries it on phones */}
            <span className="conn-label">{CONNECTION_LABELS[connectionStatus]}</span>
          </span>
        )}

        <UserMenu onOpenSettings={() => setSettingsOpen(true)} onLogout={handleLogout} />
      </header>

      {/* Content area */}
      <div className="content-area">
        {isMobile && mobileSidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />
        )}

        <aside
          id="app-sidebar"
          className={sidebarClass}
          style={isMobile ? undefined : { width: sidebarWidth }}
        >
          <WorkspaceTree />
        </aside>

        {!isMobile && desktopSidebarOpen && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuenow={sidebarWidth}
            aria-valuemin={SIDEBAR_MIN}
            aria-valuemax={SIDEBAR_MAX}
            tabIndex={0}
            className={`resize-handle${isResizing ? ' is-dragging' : ''}`}
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            onLostPointerCapture={endResize}
            onKeyDown={onResizeKeyDown}
          />
        )}

        <main className="main-pane">
          <QuillEditor />
        </main>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={closeSettings} fullScreen={isMobile} />
    </div>
  );
}

// Auth-aware wrapper to handle setup/login redirects
function AuthRoutes() {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    async function checkSetupStatus() {
      try {
        const completed = await checkSetup();
        setSetupComplete(completed);
      } catch (error) {
        console.error('Failed to check setup status:', error);
        setSetupComplete(true);
      } finally {
        setLoading(false);
      }
    }

    checkSetupStatus();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          setupComplete ? <Navigate to="/login" replace /> : <SetupPage />
        }
      />

      <Route
        path="/login"
        element={
          !setupComplete ? <Navigate to="/setup" replace /> :
          isAuthenticated ? <Navigate to="/" replace /> :
          <LoginPage />
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const baseTag = document.querySelector('base');
  const basename = baseTag?.getAttribute('href')?.replace(/\/$/, '') || '';

  return (
    <BrowserRouter basename={basename}>
      <AuthRoutes />
      <DialogHost />
    </BrowserRouter>
  );
}

export default App;
