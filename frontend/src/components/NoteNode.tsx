import { useState, useEffect } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import {
  trashNote,
  updateNote,
  type Note,
} from '../api/workspaces';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';

interface NoteNodeProps {
  note: Note;
  workspaceId: number;
  onUpdate: () => void;
}

export default function NoteNode({ note, workspaceId, onUpdate }: NoteNodeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(note.title);
  const [noteColor, setNoteColor] = useState(note.color);
  const {
    updateNote: updateNoteInStore,
    setSelectedNote,
    selectedNoteId,
    moveMode,
    enterMoveMode,
  } = useWorkspaceStore();
  
  useEffect(() => {
    setNewTitle(note.title);
  }, [note.title]);

  // Update color when note.color changes
  useEffect(() => {
    setNoteColor(note.color);
  }, [note.color]);

  const isSelected = selectedNoteId === note.id;

  function handleClick() {
    if (moveMode.active) return; // Don't select note in move mode
    setSelectedNote(note.id);
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (moveMode.active) return; // Don't open context menu in move mode
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }
  
  async function handleRename() {
    if (!newTitle.trim() || newTitle === note.title) {
      setRenaming(false);
      setNewTitle(note.title);
      return;
    }

    try {
      await updateNote(workspaceId, note.id, { title: newTitle });
      updateNoteInStore(note.id, { title: newTitle });
      setRenaming(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to rename note');
      setNewTitle(note.title);
      setRenaming(false);
    }
  }

  async function handleTrash() {
    try {
      await trashNote(workspaceId, note.id);
      updateNoteInStore(note.id, { is_trashed: true, trashed_at: new Date().toISOString() });
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to trash note');
    }
  }

  const menuItems: ContextMenuItem[] = [
    { label: 'Rename', onClick: () => setRenaming(true) },
    { label: 'Move', onClick: () => enterMoveMode('note', note.id, workspaceId, note.folder_id) },
    { label: 'Trash', onClick: handleTrash, danger: true },
  ];

  // Determine if we should show the color indicator
  const hasCustomColor = noteColor && noteColor.toUpperCase() !== '#FFFFFF';

  return (
    <div style={{ marginBottom: '2px' }}>
      <div
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          cursor: moveMode.active ? 'default' : 'pointer',
          borderRadius: '6px',
          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
          borderLeft: `3px solid ${noteColor}`,
          transition: 'background-color 0.15s',
          opacity: moveMode.active && moveMode.itemType === 'note' && moveMode.itemId === note.id
            ? 0.5
            : 1
        }}
        onMouseEnter={(e) => {
          if (!isSelected && !moveMode.active) {
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected && !moveMode.active) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span style={{ marginRight: '8px' }}>
          <span className="material-symbols-outlined" style={{ 
            fontSize: '18px',
            color: isSelected ? '#2563eb' : '#9ca3af'
          }}>
            description
          </span>
        </span>

        {!renaming ? (
          <span style={{ 
            flex: 1,
            fontSize: '14px',
            color: isSelected ? '#111827' : '#4b5563',
            fontWeight: isSelected ? 500 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {note.title}
            </span>
            {hasCustomColor && (
              <span style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                backgroundColor: noteColor,
                border: '1px solid #e5e7eb',
                flexShrink: 0
              }} title={`Note color: ${noteColor}`} />
            )}
          </span>
        ) : (
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setRenaming(false);
                setNewTitle(note.title);
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
