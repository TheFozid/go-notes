import { useState } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import { notifyError } from '../store/dialogStore';
import InputModal from './InputModal';
import {
  createWorkspace,
  createNote,
} from '../api/workspaces';
import WorkspaceNode from './WorkspaceNode';
import TagsWorkspace from './TagsWorkspace';
import SearchPanel from './SearchPanel';

export default function WorkspaceTree() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);
  const {
    workspaces,
    addWorkspace,
    addNote,
    setSelectedNote,
    selectedWorkspaceId,
    moveMode,
    exitMoveMode,
  } = useWorkspaceStore();

  const sortedWorkspaces = [...workspaces].sort((a, b) => a.name.localeCompare(b.name));

  // New notes land in the workspace you are already in, falling back to the first
  const targetWorkspace =
    sortedWorkspaces.find((w) => w.id === selectedWorkspaceId) ?? sortedWorkspaces[0];

  async function handleCreateWorkspace(name: string) {
    try {
      const workspace = await createWorkspace(name);
      addWorkspace({ ...workspace, role: 'owner' });
      setShowCreateModal(false);
    } catch (err: any) {
      notifyError(err.response?.data?.error || 'Could not create the workspace');
    }
  }

  async function handleNewNote() {
    if (!targetWorkspace || creatingNote) return;
    setCreatingNote(true);
    try {
      const note = await createNote(targetWorkspace.id, 'Untitled', null);
      addNote(note);
      // Open it straight away: a new note used to appear in the tree but you
      // still had to find and click it
      setSelectedNote(note.id);
      const { expandedWorkspaces, toggleWorkspace } = useWorkspaceStore.getState();
      if (!expandedWorkspaces.has(targetWorkspace.id)) toggleWorkspace(targetWorkspace.id);
    } catch (err: any) {
      notifyError(err.response?.data?.error || 'Could not create the note');
    } finally {
      setCreatingNote(false);
    }
  }

  return (
    <div className="sidebar-inner">
      {moveMode.active && (
        <div className="move-banner" role="status">
          <div className="move-banner-text">
            <div className="move-banner-title">
              <span className="material-symbols-outlined" aria-hidden="true">drive_file_move</span>
              Moving {moveMode.itemType}
            </div>
            <div className="move-banner-hint">
              Choose a folder to move into, or the workspace name for the top level
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={exitMoveMode}>
            Cancel
          </button>
        </div>
      )}

      {/* Search first: the most frequent way in */}
      <SearchPanel />

      <button
        className="btn btn-primary new-note-btn"
        onClick={handleNewNote}
        disabled={!targetWorkspace || creatingNote}
        title={targetWorkspace ? `New note in ${targetWorkspace.name}` : 'Create a workspace first'}
      >
        <span className="material-symbols-outlined" aria-hidden="true">add</span>
        New note
      </button>

      <div className="sidebar-section-head">
        <span className="sidebar-section-title">Workspaces</span>
        <button
          className="icon-btn icon-btn-sm"
          onClick={() => setShowCreateModal(true)}
          title="Create workspace"
          aria-label="Create workspace"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {sortedWorkspaces.length === 0 ? (
        <p className="sidebar-empty">
          No workspaces yet. Create one to start taking notes.
        </p>
      ) : (
        <div className="workspace-list">
          {sortedWorkspaces.map((workspace) => (
            <WorkspaceNode
              key={workspace.id}
              workspace={workspace}
              onUpdate={() => {}}
            />
          ))}
        </div>
      )}

      <TagsWorkspace />

      <InputModal
        isOpen={showCreateModal}
        title="Create workspace"
        placeholder="Workspace name"
        confirmText="Create"
        onConfirm={handleCreateWorkspace}
        onCancel={() => setShowCreateModal(false)}
      />
    </div>
  );
}
