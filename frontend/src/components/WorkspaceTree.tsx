import { useState } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import InputModal from './InputModal';
import {
  createWorkspace,
} from '../api/workspaces';
import WorkspaceNode from './WorkspaceNode';
import TagsWorkspace from './TagsWorkspace';
import SearchPanel from './SearchPanel';

export default function WorkspaceTree() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    workspaces,
    addWorkspace,
    moveMode,
    exitMoveMode,
  } = useWorkspaceStore();

  async function handleCreateWorkspace(name: string) {
    setError(null);
    try {
      const workspace = await createWorkspace(name);
      addWorkspace({ ...workspace, role: 'owner' });
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create workspace');
    }
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Move Mode Banner */}
      {moveMode.active && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#dbeafe',
          border: '2px solid #2563eb',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 600, 
              fontSize: '14px', 
              color: '#1e40af', 
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                drive_file_move
              </span>
              Moving {moveMode.itemType}
            </div>
            <div style={{ fontSize: '13px', color: '#3b82f6' }}>
              Click a folder to move here, or workspace title to move to root
            </div>
          </div>
          <button
            onClick={exitMoveMode}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background-color 0.15s',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              close
            </span>
            Cancel
          </button>
        </div>
      )}
      
      {/* Create Workspace Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        style={{
          width: '100%',
          padding: '10px 16px',
          marginBottom: '16px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'background-color 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
        Create Workspace
      </button>

      {/* Error display */}
      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}
      {/* Workspaces List */}
      <div style={{ marginBottom: '16px' }}>
        {workspaces.map((workspace) => (
          <WorkspaceNode
            key={workspace.id}
            workspace={workspace}
            onUpdate={() => {}}
          />
        ))}
      </div>

      {/* Tags Workspace */}
      <TagsWorkspace />
      
      {/* Search Panel */}
      <SearchPanel />

      {/* Create Workspace Modal */}
      <InputModal
        isOpen={showCreateModal}
        title="Create Workspace"
        placeholder="Workspace name"
        confirmText="Create"
        onConfirm={handleCreateWorkspace}
        onCancel={() => {
          setShowCreateModal(false);
          setError(null);
        }}
      />
    </div>
  );
}
