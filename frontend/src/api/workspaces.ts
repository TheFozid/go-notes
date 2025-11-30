import apiClient from './client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Workspace {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
  role: 'owner' | 'member';
}

export interface Folder {
  id: number;
  workspace_id: number;
  parent_id: number | null;
  name: string;
  created_at: string;
}

export interface Note {
  id: number;
  workspace_id: number;
  title: string;
  yjs_room_id: string;
  folder_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_trashed: boolean;
  trashed_at: string | null;
  color: string;
  tags?: Tag[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface WorkspaceMember {
  workspace_id: number;
  user_id: number;
  role: string;
}

// ============================================================================
// WORKSPACE ENDPOINTS
// ============================================================================

export async function getWorkspaces(): Promise<Workspace[]> {
  const response = await apiClient.get<Workspace[]>('/workspaces');
  return response.data;
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const response = await apiClient.post<Workspace>('/workspaces', { name });
  return response.data;
}

export async function updateWorkspace(id: number, name: string): Promise<void> {
  await apiClient.put(`/workspaces/${id}`, { name });
}

export async function deleteWorkspace(id: number): Promise<void> {
  await apiClient.delete(`/workspaces/${id}`);
}

// ============================================================================
// WORKSPACE MEMBERS
// ============================================================================

export async function getWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]> {
  const response = await apiClient.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
  return response.data;
}

export async function addWorkspaceMember(workspaceId: number, userId: number): Promise<void> {
  await apiClient.post(`/workspaces/${workspaceId}/members`, {
    user_id: userId,
    role: 'member',
  });
}

export async function removeWorkspaceMember(workspaceId: number, userId: number): Promise<void> {
  await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
}

export async function transferOwnership(workspaceId: number, newOwnerId: number): Promise<void> {
  await apiClient.put(`/workspaces/${workspaceId}/owner`, {
    new_owner_id: newOwnerId,
  });
}

// ============================================================================
// FOLDER ENDPOINTS
// ============================================================================

export async function getFolders(workspaceId: number): Promise<Folder[]> {
  const response = await apiClient.get<Folder[]>(`/workspaces/${workspaceId}/folders`);
  return response.data;
}

export async function createFolder(
  workspaceId: number,
  name: string,
  parentId: number | null
): Promise<Folder> {
  const response = await apiClient.post<Folder>(`/workspaces/${workspaceId}/folders`, {
    name,
    parent_id: parentId,
  });
  return response.data;
}

export async function updateFolder(
  workspaceId: number,
  folderId: number,
  name: string,
  parentId?: number | null,
  targetWorkspaceId?: number
): Promise<void> {
  const body: any = { name };
  if (parentId !== undefined) {
    body.parent_id = parentId;
  }
  if (targetWorkspaceId !== undefined) {
    body.workspace_id = targetWorkspaceId;
  }
  await apiClient.put(`/workspaces/${workspaceId}/folders/${folderId}`, body);
}

export async function deleteFolder(workspaceId: number, folderId: number): Promise<void> {
  await apiClient.delete(`/workspaces/${workspaceId}/folders/${folderId}`);
}

// ============================================================================
// NOTE ENDPOINTS
// ============================================================================

export async function getNotes(workspaceId: number): Promise<Note[]> {
  const response = await apiClient.get<Note[]>(`/workspaces/${workspaceId}/notes`);
  return response.data;
}

export async function createNote(
  workspaceId: number,
  title: string,
  folderId: number | null
): Promise<Note> {
  const response = await apiClient.post<Note>(`/workspaces/${workspaceId}/notes`, {
    title: title || 'Untitled',
    folder_id: folderId,
    tags: [],
    color: '#FFFFFF',
  });
  return response.data;
}

export async function updateNote(
  workspaceId: number,
  noteId: number,
  updates: { title?: string; folder_id?: number | null; color?: string }
): Promise<Note> {
  const response = await apiClient.put<Note>(
    `/workspaces/${workspaceId}/notes/${noteId}`,
    updates
  );
  return response.data;
}

export async function deleteNote(workspaceId: number, noteId: number): Promise<void> {
  await apiClient.delete(`/workspaces/${workspaceId}/notes/${noteId}`);
}

export async function getNote(workspaceId: number, noteId: number): Promise<Note> {
  const response = await apiClient.get<Note>(`/workspaces/${workspaceId}/notes/${noteId}`);
  return response.data;
}

// ============================================================================
// TRASH ENDPOINTS
// ============================================================================

export async function getTrashedNotes(workspaceId: number): Promise<Note[]> {
  const response = await apiClient.get<Note[]>(`/workspaces/${workspaceId}/trash`);
  return response.data;
}

export async function trashNote(workspaceId: number, noteId: number): Promise<void> {
  await apiClient.post(`/workspaces/${workspaceId}/notes/${noteId}/trash`);
}

export async function restoreNote(workspaceId: number, noteId: number): Promise<void> {
  await apiClient.post(`/workspaces/${workspaceId}/notes/${noteId}/restore`);
}

export async function emptyTrash(workspaceId: number): Promise<void> {
  await apiClient.post(`/workspaces/${workspaceId}/trash/empty`);
}

// ============================================================================
// TAG ENDPOINTS
// ============================================================================

export async function getTags(): Promise<Tag[]> {
  const response = await apiClient.get<Tag[]>('/tags');
  return response.data;
}

export async function getWorkspaceTags(workspaceId: number): Promise<Tag[]> {
  const response = await apiClient.get<Tag[]>(`/workspaces/${workspaceId}/tags`);
  return response.data;
}

export async function setNoteTags(
  workspaceId: number,
  noteId: number,
  tags: string[]
): Promise<void> {
  await apiClient.put(`/workspaces/${workspaceId}/notes/${noteId}/tags`, { tags });
}

// ============================================================================
// SEARCH ENDPOINTS
// ============================================================================

export async function updateNoteSearchText(
  workspaceId: number,
  noteId: number,
  contentText: string
): Promise<void> {
  await apiClient.put(`/workspaces/${workspaceId}/notes/${noteId}/search-text`, {
    content_text: contentText,
  });
}

export async function searchNotes(
  query: string,
  mode: 'metadata' | 'full' = 'metadata'
): Promise<Note[]> {
  const response = await apiClient.get<Note[]>('/search', {
    params: { q: query, mode },
  });
  return response.data || []; // Add fallback to empty array
}
