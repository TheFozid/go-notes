import { useState, useEffect } from 'react';
import ContextMenu from './ContextMenu';
import useWorkspaceStore from '../store/workspaceStore';
import { confirmDialog, notifyError } from '../store/dialogStore';
import {
  getTrashedNotes,
  restoreNote,
  deleteNote,
  emptyTrash,
  type Note,
} from '../api/workspaces';

interface TrashNodeProps {
  workspaceId: number;
  onUpdate: () => void;
}

export default function TrashNode({ workspaceId, onUpdate }: TrashNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId?: number } | null>(null);

  const { updateNote: updateNoteInStore, removeNote: removeNoteFromStore } = useWorkspaceStore();

  /*
   * Trashed notes are fetched rather than read from the store, because the
   * initial load only pulls untrashed ones. Re-fetch whenever the number of
   * trashed notes for this workspace changes, so trashing a note or deleting a
   * folder updates the count without a reload.
   */
  const trashedCount = useWorkspaceStore(
    (state) => state.notes.filter((n) => n.workspace_id === workspaceId && n.is_trashed).length
  );

  useEffect(() => {
    loadTrashedNotes();
  }, [workspaceId, trashedCount]);

  async function loadTrashedNotes() {
    try {
      const notes = await getTrashedNotes(workspaceId);
      setTrashedNotes(notes && Array.isArray(notes) ? notes : []);
    } catch (err: any) {
      console.error('Failed to load trashed notes:', err);
      setTrashedNotes([]);
    }
  }

  async function handleRestore(noteId: number) {
    try {
      await restoreNote(workspaceId, noteId);
      updateNoteInStore(noteId, { is_trashed: false, trashed_at: null });
      loadTrashedNotes();
      onUpdate();
    } catch (err: any) {
      notifyError(err.response?.data?.error || 'Failed to restore note');
    }
  }

  async function handleDeletePermanently(noteId: number) {
    const note = trashedNotes.find((n) => n.id === noteId);
    const confirmed = await confirmDialog({
      title: 'Delete note permanently',
      message: note
        ? `Permanently delete "${note.title}"? This cannot be undone.`
        : 'Permanently delete this note? This cannot be undone.',
      confirmText: 'Delete permanently',
      isDangerous: true,
    });
    if (!confirmed) return;

    try {
      await deleteNote(workspaceId, noteId);
      removeNoteFromStore(noteId);
      loadTrashedNotes();
      onUpdate();
    } catch (err: any) {
      notifyError(err.response?.data?.error || 'Failed to delete note');
    }
  }

  async function handleEmptyTrash() {
    const confirmed = await confirmDialog({
      title: 'Empty trash',
      message: `Permanently delete ${trashedNotes.length} note${trashedNotes.length === 1 ? '' : 's'} in the trash? This cannot be undone.`,
      confirmText: 'Empty trash',
      isDangerous: true,
    });
    if (!confirmed) return;

    try {
      await emptyTrash(workspaceId);
      trashedNotes.forEach((note) => removeNoteFromStore(note.id));
      loadTrashedNotes();
      onUpdate();
    } catch (err: any) {
      notifyError(err.response?.data?.error || 'Failed to empty trash');
    }
  }

  function handleContextMenu(e: React.MouseEvent, noteId?: number) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, noteId });
  }

  const count = trashedNotes.length;

  const trashMenuItems = count > 0 ? [
    { label: 'Empty Trash', onClick: handleEmptyTrash, danger: true },
  ] : [];

  const noteMenuItems = contextMenu?.noteId ? [
    { label: 'Restore', onClick: () => handleRestore(contextMenu.noteId!) },
    { label: 'Delete Permanently', onClick: () => handleDeletePermanently(contextMenu.noteId!), danger: true },
  ] : [];

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Trash Header */}
      <div
        onContextMenu={(e) => handleContextMenu(e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          cursor: 'pointer',
          borderRadius: '6px',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ 
          marginRight: '8px',
          userSelect: 'none',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          width: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {isExpanded ? 'expand_more' : 'chevron_right'}
          </span>
        </span>
        <span style={{ marginRight: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-tertiary)' }}>
            delete
          </span>
        </span>
        <span style={{ 
          flex: 1,
          fontSize: '14px',
          color: 'var(--text-secondary)',
          fontWeight: 500
        }}>
          Trash
        </span>
        <span style={{ 
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          backgroundColor: 'var(--bg-hover)',
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 500
        }}>
          {count}
        </span>
      </div>

      {/* Trashed Notes */}
      {isExpanded && (
        <div style={{ marginLeft: '24px', marginTop: '4px' }}>
          {count === 0 ? (
            <div style={{ 
              padding: '12px',
              color: 'var(--text-tertiary)',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              No items in trash
            </div>
          ) : (
            trashedNotes.map((note) => (
              <div
                key={note.id}
                onContextMenu={(e) => handleContextMenu(e, note.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  marginBottom: '2px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${note.color}`,
                  backgroundColor: 'transparent',
                  opacity: 0.6,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.6';
                }}
              >
                <span style={{ marginRight: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-tertiary)' }}>
                    description
                  </span>
                </span>
                <span style={{ 
                  flex: 1,
                  fontSize: '14px',
                  color: 'var(--text-secondary)'
                }}>
                  {note.title}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.noteId ? noteMenuItems : trashMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
