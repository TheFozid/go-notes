import { useState } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import {
  createWorkspace,
} from '../api/workspaces';
import WorkspaceNode from './WorkspaceNode';
import TagsWorkspace from './TagsWorkspace';
import SearchPanel from './SearchPanel';

export default function WorkspaceTree() {
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const {
    workspaces,
    addWorkspace,
  } = useWorkspaceStore();

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      const workspace = await createWorkspace(newWorkspaceName);
      addWorkspace({ ...workspace, role: 'owner' });
      setNewWorkspaceName('');
      setCreatingWorkspace(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create workspace');
    }
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Create Workspace Button */}
      {!creatingWorkspace ? (
        <button
          onClick={() => setCreatingWorkspace(true)}
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
      ) : (
        <form
          onSubmit={handleCreateWorkspace}
          style={{
            marginBottom: '16px',
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
          }}
        >
          <input
            type="text"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Workspace name"
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
          {error && (
            <div style={{
              padding: '8px',
              marginBottom: '8px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatingWorkspace(false);
                setNewWorkspaceName('');
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              Cancel
            </button>
          </div>
        </form>
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
    </div>
  );
}
