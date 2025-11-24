import { useState } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import {
  updateFolder,
  deleteFolder,
  createFolder,
  createNote,
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
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);

  const {
    expandedFolders,
    toggleFolder,
    updateFolder: updateFolderInStore,
    removeFolder: removeFolderFromStore,
    addFolder,
    addNote,
    getChildFolders,
    getNotesInFolder,
  } = useWorkspaceStore();

  const isExpanded = expandedFolders.has(folder.id);
  const childFolders = getChildFolders(folder.id);
  const notesInFolder = getNotesInFolder(folder.id, workspaceId);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  async function handleRename() {
    if (!newName.trim() || newName === folder.name) {
      setRenaming(false);
      setNewName(folder.name);
      return;
    }

    try {
      await updateFolder(workspaceId, folder.id, newName);
      updateFolderInStore(folder.id, { name: newName });
      setRenaming(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to rename folder');
      setNewName(folder.name);
      setRenaming(false);
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

  async function handleAddSubfolder() {
    const name = prompt('Subfolder name:');
    if (!name?.trim()) return;

    try {
      const newFolder = await createFolder(workspaceId, name, folder.id);
      addFolder(newFolder);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create subfolder');
    }
  }

  async function handleAddNote() {
    const title = prompt('Note title:');
    if (!title?.trim()) return;

    try {
      const note = await createNote(workspaceId, title, folder.id);
      addNote(note);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create note');
    }
  }

  const menuItems: ContextMenuItem[] = [
    { label: 'Rename', onClick: () => setRenaming(true) },
    { label: 'Add Folder', onClick: handleAddSubfolder },
    { label: 'Add Note', onClick: handleAddNote },
    { label: 'Delete', onClick: handleDelete, danger: true },
  ];

  return (
    <div style={{ marginBottom: '2px' }}>
      {/* Folder Header */}
      <div
        onContextMenu={handleContextMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          cursor: 'pointer',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span
          onClick={() => toggleFolder(folder.id)}
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
          onClick={() => toggleFolder(folder.id)}
          style={{ marginRight: '8px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#9ca3af' }}>
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
        </span>

        {!renaming ? (
          <span
            onClick={() => toggleFolder(folder.id)}
            style={{ 
              flex: 1,
              fontSize: '14px',
              color: '#374151'
            }}
          >
            {folder.name}
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
                setNewName(folder.name);
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
    </div>
  );
}
