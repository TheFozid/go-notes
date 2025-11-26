import { useState } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import InputModal from './InputModal';
import ConfirmModal from './ConfirmModal';
import useAuthStore from '../store/authStore';
import {
  updateWorkspace,
  deleteWorkspace,
  removeWorkspaceMember,
  createFolder,
  createNote,
  updateFolder,
  updateNote,
  type Workspace,
} from '../api/workspaces';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import ManageAccessModal from './ManageAccessModal';
import FolderNode from './FolderNode';
import NoteNode from './NoteNode';
import TrashNode from './TrashNode';

interface WorkspaceNodeProps {
  workspace: Workspace;
  onUpdate: () => void;
}

export default function WorkspaceNode({ workspace, onUpdate }: WorkspaceNodeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(workspace.name);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const {
    expandedWorkspaces,
    toggleWorkspace,
    updateWorkspace: updateWorkspaceInStore,
    removeWorkspace: removeWorkspaceFromStore,
    addFolder,
    addNote,
    getRootFolders,
    getNotesInFolder,
    moveMode,
    exitMoveMode,
    canMoveTo,
    updateFolder: updateFolderInStore,
    updateNote: updateNoteInStore,
  } = useWorkspaceStore();

  const isExpanded = expandedWorkspaces.has(workspace.id);
  const isOwner = workspace.role === 'owner';
  const rootFolders = getRootFolders(workspace.id);
  const rootNotes = getNotesInFolder(null, workspace.id);

  function handleContextMenu(e: React.MouseEvent) {
    if (moveMode.active) return; // Don't open context menu in move mode
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  async function handleRename() {
    if (!newName.trim() || newName === workspace.name) {
      setRenaming(false);
      setNewName(workspace.name);
      return;
    }

    try {
      await updateWorkspace(workspace.id, newName);
      updateWorkspaceInStore(workspace.id, { name: newName });
      setRenaming(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to rename workspace');
      setNewName(workspace.name);
      setRenaming(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteWorkspace(workspace.id);
      removeWorkspaceFromStore(workspace.id);
      setShowDeleteModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete workspace');
    }
  }

  async function handleLeave() {
    try {
      await removeWorkspaceMember(workspace.id, user!.id);
      removeWorkspaceFromStore(workspace.id);
      setShowLeaveModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to leave workspace');
    }
  }

  async function handleAddFolder(name: string) {
    try {
      const folder = await createFolder(workspace.id, name, null);
      addFolder(folder);
      setShowAddFolderModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create folder');
    }
  }

  async function handleAddNote(title: string) {
    try {
      const note = await createNote(workspace.id, title, null);
      addNote(note);
      setShowAddNoteModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create note');
    }
  }
  
  async function handleMoveToRoot() {
    if (!moveMode.active || moveMode.sourceWorkspaceId !== workspace.id) return;
    if (!canMoveTo(null)) {
      alert('Cannot move here (same location)');
      return;
    }
    
    try {
      if (moveMode.itemType === 'folder') {
        const folderToMove = useWorkspaceStore.getState().getFolderById(moveMode.itemId!);
        if (!folderToMove) {
          alert('Folder not found');
          return;
        }
        await updateFolder(workspace.id, moveMode.itemId!, folderToMove.name, null);
        updateFolderInStore(moveMode.itemId!, { parent_id: null });
      } else if (moveMode.itemType === 'note') {
        await updateNote(workspace.id, moveMode.itemId!, { folder_id: null });
        updateNoteInStore(moveMode.itemId!, { folder_id: null });
      }
      
      exitMoveMode();
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to move item');
    }
  }

  const ownerMenuItems: ContextMenuItem[] = [
    { label: 'Rename', onClick: () => setRenaming(true) },
    { label: 'Add Folder', onClick: () => setShowAddFolderModal(true) },
    { label: 'Add Note', onClick: () => setShowAddNoteModal(true) },
    { label: 'Manage Access', onClick: () => setShowManageAccess(true) },
    { label: 'Delete', onClick: () => setShowDeleteModal(true), danger: true },
  ];

  const memberMenuItems: ContextMenuItem[] = [
    { label: 'Add Folder', onClick: () => setShowAddFolderModal(true) },
    { label: 'Add Note', onClick: () => setShowAddNoteModal(true) },
    { label: 'Leave Workspace', onClick: () => setShowLeaveModal(true), danger: true },
  ];

  const menuItems = isOwner ? ownerMenuItems : memberMenuItems;

  return (
    <div style={{ marginBottom: '4px' }}>
      {/* Workspace Header */}
      <div
        onContextMenu={handleContextMenu}
        onClick={() => {
          if (moveMode.active && moveMode.sourceWorkspaceId === workspace.id) {
            handleMoveToRoot();
          } else {
            toggleWorkspace(workspace.id);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          cursor: 'pointer',
          borderRadius: '6px',
          backgroundColor: moveMode.active && moveMode.sourceWorkspaceId === workspace.id && canMoveTo(null)
            ? '#dbeafe'
            : 'transparent',
          border: moveMode.active && moveMode.sourceWorkspaceId === workspace.id && canMoveTo(null)
            ? '2px solid #2563eb'
            : '2px solid transparent',
          transition: 'all 0.15s'
        }}
        onMouseEnter={(e) => {
          if (!moveMode.active) {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
        onMouseLeave={(e) => {
          if (!moveMode.active) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span
          style={{ 
            marginRight: '8px',
            userSelect: 'none',
            color: '#6b7280',
            fontSize: '12px',
            width: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {isExpanded ? 'expand_more' : 'chevron_right'}
          </span>
        </span>

        <span
          style={{ marginRight: '8px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#6b7280' }}>
            {isExpanded ? 'menu_book' : 'book_5'}
          </span>
        </span>

        {!renaming ? (
          <span
            style={{ 
              flex: 1,
              fontWeight: 600,
              fontSize: '14px',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {workspace.name}
            <span 
              className="material-symbols-outlined" 
              style={{ 
                fontSize: '16px',
                color: isOwner ? '#f59e0b' : '#6b7280'
              }}
              title={isOwner ? 'Owner' : 'Member'}
            >
              {isOwner ? 'workspace_premium' : 'badge'}
            </span>
          </span>
        ) : (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setRenaming(false);
                setNewName(workspace.name);
              }
            }}
            autoFocus
            style={{
              flex: 1,
              padding: '4px 8px',
              border: '2px solid #2563eb',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Workspace Children */}
      {isExpanded && (
        <div style={{ marginLeft: '24px' }}>
          {rootFolders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              workspaceId={workspace.id}
              onUpdate={onUpdate}
            />
          ))}

          {rootNotes.map((note) => (
            <NoteNode
              key={note.id}
              note={note}
              workspaceId={workspace.id}
              onUpdate={onUpdate}
            />
          ))}

          <TrashNode workspaceId={workspace.id} onUpdate={onUpdate} />
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showManageAccess && (
        <ManageAccessModal
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          onClose={() => setShowManageAccess(false)}
          onUpdate={onUpdate}
        />
      )}

      {/* Add Folder Modal */}
      <InputModal
        isOpen={showAddFolderModal}
        title="Create Folder"
        placeholder="Folder name"
        confirmText="Create"
        onConfirm={handleAddFolder}
        onCancel={() => setShowAddFolderModal(false)}
      />

      {/* Add Note Modal */}
      <InputModal
        isOpen={showAddNoteModal}
        title="Create Note"
        placeholder="Note title"
        confirmText="Create"
        onConfirm={handleAddNote}
        onCancel={() => setShowAddNoteModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Workspace"
        message={`Are you sure you want to delete "${workspace.name}"? This will permanently delete all folders and notes. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Leave Confirmation Modal */}
      <ConfirmModal
        isOpen={showLeaveModal}
        title="Leave Workspace"
        message={`Are you sure you want to leave "${workspace.name}"? You will lose access to all notes and folders in this workspace.`}
        confirmText="Leave"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleLeave}
        onCancel={() => setShowLeaveModal(false)}
      />
    </div>
  );
}
