import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { checkSetup } from './api/auth';
import useAuthStore from './store/authStore';
import useWorkspaceStore from './store/workspaceStore';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './components/UserManagement';
import WorkspaceTree from './components/WorkspaceTree';
import QuillEditor from './components/QuillEditor';
import { getWorkspaces, getFolders, getNotes } from './api/workspaces';

const LAST_NOTE_KEY = 'go-notes-last-selected-note';

// Main app layout
function MainApp() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Resizing state
  const [resizing, setResizing] = useState<'left' | 'right' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartLeftWidth, setDragStartLeftWidth] = useState(0);
  const [dragStartRightWidth, setDragStartRightWidth] = useState(0);

  const clearAuth = useAuthStore((state) => state.clearAuth);
  const selectedNoteId = useWorkspaceStore((state) => state.selectedNoteId);
  const getNotePath = useWorkspaceStore((state) => state.getNotePath);
  const { setWorkspaces, setFolders, setNotes, setSelectedNote, toggleWorkspace, toggleFolder } = useWorkspaceStore();

  // Handle panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;

      const deltaX = e.clientX - dragStartX;

      if (resizing === 'left') {
        const newWidth = dragStartLeftWidth + deltaX;
        // Constrain width between 150px and 600px
        if (newWidth >= 150 && newWidth <= 600) {
          setLeftWidth(newWidth);
        }
      } else if (resizing === 'right') {
        const newWidth = dragStartRightWidth - deltaX;
        // Constrain width between 250px and 600px
        if (newWidth >= 250 && newWidth <= 600) {
          setRightWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      if (resizing) {
        setResizing(null);
        document.body.style.cursor = '';
      }
    };

    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      // Disable text selection during drag
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing, dragStartX, dragStartLeftWidth, dragStartRightWidth]);

  const startDragLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing('left');
    setDragStartX(e.clientX);
    setDragStartLeftWidth(leftWidth);
  };

  const startDragRight = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing('right');
    setDragStartX(e.clientX);
    setDragStartRightWidth(rightWidth);
  };

  // Load data and restore last note on mount
  useEffect(() => {
    async function loadAndRestore() {
      try {
        // Load all data
        const workspacesData = await getWorkspaces();
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

  const pathParts = selectedNoteId ? getNotePath(selectedNoteId).split(' > ') : [];
  
  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#ffffff'
    }}>
      {/* Modern Top Bar */}
      <div style={{ 
        height: '56px',
        backgroundColor: '#ffffff',
        padding: '0 16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0
      }}>
        {/* Left: Panel toggle */}
        <button 
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            color: '#6b7280',
            borderRadius: '6px',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6b7280';
          }}
          title="Toggle left panel"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {leftPanelOpen ? 'left_panel_close' : 'left_panel_open'}
          </span>
        </button>

        {/* Center: Breadcrumb path or app title */}
        {selectedNoteId ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflow: 'hidden',
            fontSize: '14px'
          }}>
            {pathParts.map((part, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                minWidth: 0,
                maxWidth: index === pathParts.length - 1 ? 'none' : '200px'
              }}>
                <span style={{
                  color: index === pathParts.length - 1 ? '#111827' : '#6b7280',
                  fontWeight: index === pathParts.length - 1 ? 600 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {part}
                </span>
                {index < pathParts.length - 1 && (
                  <span className="material-symbols-outlined" style={{ 
                    fontSize: '16px',
                    color: '#d1d5db',
                    flexShrink: 0
                  }}>
                    chevron_right
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            flex: 1,
            fontSize: '16px',
            fontWeight: 600,
            color: '#111827',
            letterSpacing: '-0.01em'
          }}>
            go-notes
          </div>
        )}

        {/* Right: Actions */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button 
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              color: '#6b7280',
              borderRadius: '6px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
            title="Toggle right panel (User Management)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
          </button>
          
          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              color: '#ef4444',
              borderRadius: '6px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Logout"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        userSelect: resizing ? 'none' : 'auto'
      }}>
        {/* Left Panel */}
        {leftPanelOpen && (
          <div style={{ 
            width: leftWidth,
            backgroundColor: '#f9fafb',
            borderRight: '1px solid #e5e7eb',
            overflowY: 'auto',
            flexShrink: 0
          }}>
            <WorkspaceTree />
          </div>
        )}

        {/* Left Drag Handle */}
        {leftPanelOpen && (
          <div
            onMouseDown={startDragLeft}
            style={{
              width: '5px',
              cursor: 'col-resize',
              backgroundColor: '#e5e7eb',
              flexShrink: 0,
              zIndex: 10,
              transition: resizing ? 'none' : 'background-color 0.2s',
            }}
            onMouseEnter={(e) => { if (!resizing) e.currentTarget.style.backgroundColor = '#d1d5db'; }}
            onMouseLeave={(e) => { if (!resizing) e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
          />
        )}

        {/* Main Content */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
          backgroundColor: '#ffffff'
        }}>
          <QuillEditor />
        </div>

        {/* Right Drag Handle */}
        {rightPanelOpen && (
          <div
            onMouseDown={startDragRight}
            style={{
              width: '5px',
              cursor: 'col-resize',
              backgroundColor: '#e5e7eb',
              flexShrink: 0,
              zIndex: 10,
              transition: resizing ? 'none' : 'background-color 0.2s',
            }}
            onMouseEnter={(e) => { if (!resizing) e.currentTarget.style.backgroundColor = '#d1d5db'; }}
            onMouseLeave={(e) => { if (!resizing) e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
          />
        )}

        {/* Right Panel */}
        {rightPanelOpen && (
          <div style={{ 
            width: rightWidth,
            backgroundColor: '#f9fafb',
            borderLeft: '1px solid #e5e7eb',
            padding: '16px',
            overflowY: 'auto',
            flexShrink: 0
          }}>
            <UserManagement />
          </div>
        )}
        )}
      </div>
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
    </BrowserRouter>
  );
}

export default App;
