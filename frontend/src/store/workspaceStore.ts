import { create } from 'zustand';
import type { Workspace, Folder, Note } from '../api/workspaces';

interface WorkspaceState {
  // Data
  workspaces: Workspace[];
  folders: Folder[];
  notes: Note[];
  
  // UI State
  selectedWorkspaceId: number | null;
  selectedNoteId: number | null;
  expandedWorkspaces: Set<number>;
  expandedFolders: Set<number>;
  
  // Move mode state
  moveMode: {
    active: boolean;
    itemType: 'note' | 'folder' | null;
    itemId: number | null;
    sourceWorkspaceId: number | null;
    sourceFolderId: number | null;
  };
  
  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: number, updates: Partial<Workspace>) => void;
  removeWorkspace: (id: number) => void;
  
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: number, updates: Partial<Folder>) => void;
  removeFolder: (id: number) => void;
  
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: number, updates: Partial<Note>) => void;
  removeNote: (id: number) => void;
  
  setSelectedWorkspace: (id: number | null) => void;
  setSelectedNote: (id: number | null) => void;
  
  toggleWorkspace: (id: number) => void;
  toggleFolder: (id: number) => void;
  
  // Move mode actions
  enterMoveMode: (itemType: 'note' | 'folder', itemId: number, workspaceId: number, folderId: number | null) => void;
  exitMoveMode: () => void;
  canMoveTo: (targetFolderId: number | null) => boolean;
  
  // Helper methods
  getWorkspaceById: (id: number) => Workspace | undefined;
  getFolderById: (id: number) => Folder | undefined;
  getNoteById: (id: number) => Note | undefined;
  getRootFolders: (workspaceId: number) => Folder[];
  getChildFolders: (parentId: number) => Folder[];
  getNotesInFolder: (folderId: number | null, workspaceId: number) => Note[];
  getTrashedNotes: (workspaceId: number) => Note[];
  getNotesByTag: (tagName: string) => Note[];
  getAllUserTags: () => [string, number][];
  getNotePath: (noteId: number) => string;
}

const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // Initial state
  workspaces: [],
  folders: [],
  notes: [],
  selectedWorkspaceId: null,
  selectedNoteId: null,
  expandedWorkspaces: new Set<number>(),
  expandedFolders: new Set<number>(),
  
  moveMode: {
    active: false,
    itemType: null,
    itemId: null,
    sourceWorkspaceId: null,
    sourceFolderId: null,
  },
  
  // Workspace actions
  setWorkspaces: (workspaces) => set({ workspaces }),
  
  addWorkspace: (workspace) => set((state) => ({
    workspaces: [...state.workspaces, workspace],
  })),
  
  updateWorkspace: (id, updates) => set((state) => ({
    workspaces: state.workspaces.map((ws) =>
      ws.id === id ? { ...ws, ...updates } : ws
    ),
  })),
  
  removeWorkspace: (id) => set((state) => ({
    workspaces: state.workspaces.filter((ws) => ws.id !== id),
    folders: state.folders.filter((f) => f.workspace_id !== id),
    notes: state.notes.filter((n) => n.workspace_id !== id),
    selectedWorkspaceId: state.selectedWorkspaceId === id ? null : state.selectedWorkspaceId,
  })),
  
  // Folder actions
  setFolders: (folders) => set({ folders }),
  
  addFolder: (folder) => set((state) => ({
    folders: [...state.folders, folder],
  })),
  
  updateFolder: (id, updates) => set((state) => ({
    folders: state.folders.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    ),
  })),
  
  removeFolder: (id) => set((state) => {
    // Remove folder and all descendant folders
    const toRemove = new Set<number>([id]);
    let changed = true;
    
    while (changed) {
      changed = false;
      state.folders.forEach((f) => {
        if (f.parent_id && toRemove.has(f.parent_id) && !toRemove.has(f.id)) {
          toRemove.add(f.id);
          changed = true;
        }
      });
    }
    
    return {
      folders: state.folders.filter((f) => !toRemove.has(f.id)),
      notes: state.notes.filter((n) => n.folder_id === null || !toRemove.has(n.folder_id)),
    };
  }),
  
  // Note actions
  setNotes: (notes) => set({ notes }),
  
  addNote: (note) => set((state) => ({
    notes: [...state.notes, note],
  })),
  
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) =>
      n.id === id ? { ...n, ...updates } : n
    ),
  })),
  
  removeNote: (id) => set((state) => ({
    notes: state.notes.filter((n) => n.id !== id),
    selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
  })),
  
  // Selection actions
  setSelectedWorkspace: (id) => set({ selectedWorkspaceId: id }),
setSelectedNote: (id) => set((state) => {
  // Find the note and set its workspace as selected too
  if (id !== null) {
    const note = state.notes.find(n => n.id === id);
    if (note) {
      return { 
        selectedNoteId: id,
        selectedWorkspaceId: note.workspace_id 
      };
    }
  }
  return { selectedNoteId: id };
}),
  
  // Toggle actions
  toggleWorkspace: (id) => set((state) => {
    const expanded = new Set(state.expandedWorkspaces);
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
    return { expandedWorkspaces: expanded };
  }),
  
  toggleFolder: (id) => set((state) => {
    const expanded = new Set(state.expandedFolders);
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
    return { expandedFolders: expanded };
  }),
  
  // Move mode actions
  enterMoveMode: (itemType, itemId, workspaceId, folderId) => {
    console.log('[MoveMode] Entering move mode:', { itemType, itemId, workspaceId, folderId });
    set({
      moveMode: {
        active: true,
        itemType,
        itemId,
        sourceWorkspaceId: workspaceId,
        sourceFolderId: folderId,
      }
    });
  },
  
  exitMoveMode: () => {
    console.log('[MoveMode] Exiting move mode');
    set({
      moveMode: {
        active: false,
        itemType: null,
        itemId: null,
        sourceWorkspaceId: null,
        sourceFolderId: null,
      }
    });
  },
  
  canMoveTo: (targetFolderId) => {
    const state = get();
    const { itemType, itemId, sourceFolderId } = state.moveMode;
    
    if (!itemType || !itemId) return false;
    
    // Can't move to same location
    if (targetFolderId === sourceFolderId) {
      console.log('[MoveMode] Cannot move to same location');
      return false;
    }
    
    // If moving a folder, prevent moving into itself or its descendants
    if (itemType === 'folder') {
      // Can't move folder into itself
      if (targetFolderId === itemId) {
        console.log('[MoveMode] Cannot move folder into itself');
        return false;
      }
      
      // Check if target is a descendant of the folder being moved
      if (targetFolderId !== null) {
        let currentFolder = state.getFolderById(targetFolderId);
        while (currentFolder) {
          if (currentFolder.id === itemId) {
            console.log('[MoveMode] Cannot move folder into its descendant');
            return false;
          }
          currentFolder = currentFolder.parent_id ? state.getFolderById(currentFolder.parent_id) : undefined;
        }
      }
    }
    
    console.log('[MoveMode] Can move to target:', targetFolderId);
    return true;
  },
  
  
  // Helper methods
  getWorkspaceById: (id) => {
    return get().workspaces.find((ws) => ws.id === id);
  },
  
  getFolderById: (id) => {
    return get().folders.find((f) => f.id === id);
  },
  
  getNoteById: (id) => {
    return get().notes.find((n) => n.id === id);
  },
  
  getRootFolders: (workspaceId) => {
    return get().folders.filter(
      (f) => f.workspace_id === workspaceId && f.parent_id === null
    );
  },
  
  getChildFolders: (parentId) => {
    return get().folders.filter((f) => f.parent_id === parentId);
  },
  
  getNotesInFolder: (folderId, workspaceId) => {
    return get().notes.filter(
      (n) => n.workspace_id === workspaceId && 
             n.folder_id === folderId && 
             !n.is_trashed
    );
  },
  
  getTrashedNotes: (workspaceId) => {
    return get().notes.filter(
      (n) => n.workspace_id === workspaceId && n.is_trashed
    );
  },
  getNotesByTag: (tagName: string) => {
    return get().notes.filter(
      (n) => !n.is_trashed && n.tags?.some(t => t.name === tagName)
    );
  },
  
  getAllUserTags: () => {
    // Get all unique tags from all non-trashed notes
    const tagMap = new Map<string, number>();
    
    get().notes.forEach((note) => {
      if (!note.is_trashed && note.tags) {
        note.tags.forEach((tag) => {
          tagMap.set(tag.name, (tagMap.get(tag.name) || 0) + 1);
        });
      }
    });
    
    // Return sorted array of [tagName, count] tuples
    return Array.from(tagMap.entries())
      .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
  },
getNotePath: (noteId: number) => {
    const state = get();
    const note = state.getNoteById(noteId);
    if (!note) return '';
    
    const workspace = state.getWorkspaceById(note.workspace_id);
    const workspaceName = workspace?.name || 'Unknown';
    
    let path = workspaceName;
    
    // Add folder path if note is in a folder
    if (note.folder_id) {
      const folders: string[] = [];
      let currentFolderId: number | null = note.folder_id;
      
      // Walk up the folder tree
      while (currentFolderId !== null) {
        const folder = state.getFolderById(currentFolderId);
        if (!folder) break;
        folders.unshift(folder.name);
        currentFolderId = folder.parent_id;
      }
      
      if (folders.length > 0) {
        path += ' > ' + folders.join(' > ');
      }
    }
    
    // Add note title
    path += ' > ' + note.title;
    
    return path;
  },
}));

export default useWorkspaceStore;
