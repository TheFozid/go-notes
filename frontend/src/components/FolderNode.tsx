import { useState } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import InputModal from './InputModal';
import {
  updateFolder,
  deleteFolder,
  createFolder,
  createNote,
  updateNote,
  type Folder,
} from '../api/workspaces';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import NoteNode from './NoteNode';

interface FolderNodeProps {
  folder: Folder;
  workspaceId: number;
  onUpdate: () => void;
}

export default function FolderNode({ folder, workspaceId, onUpdate }: FolderNodeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showAddSubfolderModal, setShowAddSubfolderModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const {
    expandedFolders,
    toggleFolder,
    updateFolder: updateFolderInStore,
    removeFolder: removeFolderFromStore,
    addFolder,
    addNote,
    getChildFolders,
    getNotesInFolder,
    moveMode,
    enterMoveMode,
    exitMoveMode,
    canMoveTo,
    updateNote: updateNoteInStore,
  } = useWorkspaceStore();

  const isExpanded = expandedFolders.has(folder.id);
  const childFolders = getChildFolders(folder.id);
  const notesInFolder = getNotesInFolder(folder.id, workspaceId);

  function handleContextMenu(e: React.MouseEvent) {
    if (moveMode.active) return; // Don't open context menu in move mode
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  async function handleRename(newName: string) {
    if (newName === folder.name) {
      setShowRenameModal(false);
      return;
    }

    try {
      await updateFolder(workspaceId, folder.id, newName);
      updateFolderInStore(folder.id, { name: newName });
      setShowRenameModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to rename folder');
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete folder "${folder.name}"? This will delete all subfolders and notes.`)) {
      return;
    }

    try {
      await deleteFolder(workspaceId, folder.id);
      removeFolderFromStore(folder.id);
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete folder');
    }
  }

  async function handleAddSubfolder(name: string) {
    try {
      const newFolder = await createFolder(workspaceId, name, folder.id);
      addFolder(newFolder);
      setShowAddSubfolderModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create subfolder');
    }
  }

  async function handleAddNote(title: string) {
    try {
      const note = await createNote(workspaceId, title, folder.id);
      addNote(note);
      setShowAddNoteModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create note');
    }
  }
  
  async function handleMoveHere() {
    if (!moveMode.active) return;
    if (!canMoveTo(folder.id)) {
      alert('Cannot move here (would create a cycle or same location)');
      return;
    }
    
    try {
      if (moveMode.itemType === 'folder') {
        // Move folder - get current name first
        const folderToMove = useWorkspaceStore.getState().getFolderById(moveMode.itemId!);
        if (!folderToMove) {
          alert('Folder not found');
          return;
        }
        await updateFolder(workspaceId, moveMode.itemId!, folderToMove.name, folder.id);
        updateFolderInStore(moveMode.itemId!, { parent_id: folder.id });
      } else if (moveMode.itemType === 'note') {
        // Move note
        await updateNote(workspaceId, moveMode.itemId!, { folder_id: folder.id });
        updateNoteInStore(moveMode.itemId!, { folder_id: folder.id });
      }
      
      exitMoveMode();
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to move item');
    }
  }

const menuItems: ContextMenuItem[] = [
    { label: 'Rename', onClick: () => setShowRenameModal(true) },
    { label: 'Move', onClick: () => enterMoveMode('folder', folder.id, workspaceId, folder.parent_id) },
    { label: 'Add Folder', onClick: () => setShowAddSubfolderModal(true) },
    { label: 'Add Note', onClick: () => setShowAddNoteModal(true) },
    { label: 'Delete', onClick: handleDelete, danger: true },
  ];

  return (
    <div style={{ marginBottom: '2px' }}>
      {/* Folder Header */}
      <div
        onContextMenu={handleContextMenu}
        onClick={() => {
          if (moveMode.active && moveMode.sourceWorkspaceId === workspaceId) {
            handleMoveHere();
          } else {
            toggleFolder(folder.id);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          cursor: 'pointer',
          borderRadius: '6px',
          backgroundColor: moveMode.active && moveMode.sourceWorkspaceId === workspaceId && canMoveTo(folder.id) 
            ? '#dbeafe' 
            : 'transparent',
          border: moveMode.active && moveMode.sourceWorkspaceId === workspaceId && canMoveTo(folder.id)
            ? '2px solid #2563eb'
            : '2px solid transparent',
          transition: 'all 0.15s',
          opacity: moveMode.active && moveMode.sourceWorkspaceId === workspaceId && !canMoveTo(folder.id)
            ? 0.5
            : 1
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
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#9ca3af' }}>
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
        </span>

        <span
          style={{ 
            flex: 1,
            fontSize: '14px',
            color: '#374151'
          }}
        >
          {folder.name}
        </span>
      </div>

      {/* Folder Children */}
      {isExpanded && (
        <div style={{ marginLeft: '24px' }}>
          {childFolders.map((childFolder) => (
            <FolderNode
              key={childFolder.id}
              folder={childFolder}
              workspaceId={workspaceId}
              onUpdate={onUpdate}
            />
          ))}

          {notesInFolder.map((note) => (
            <NoteNode
              key={note.id}
              note={note}
              workspaceId={workspaceId}
              onUpdate={onUpdate}
            />
          ))}
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

      {/* Rename Modal */}
      <InputModal
        isOpen={showRenameModal}
        title="Rename Folder"
        placeholder="Folder name"
        defaultValue={folder.name}
        confirmText="Rename"
        onConfirm={handleRename}
        onCancel={() => setShowRenameModal(false)}
      />

      {/* Add Subfolder Modal */}
      <InputModal
        isOpen={showAddSubfolderModal}
        title="Create Subfolder"
        placeholder="Subfolder name"
        confirmText="Create"
        onConfirm={handleAddSubfolder}
        onCancel={() => setShowAddSubfolderModal(false)}
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
    </div>
  );
}
