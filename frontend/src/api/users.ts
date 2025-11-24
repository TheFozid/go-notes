import apiClient from './client';

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  is_admin: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
}

// Get all users (accessible to all authenticated users)
export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<User[]>('/users');
  return response.data;
}

// Create user (admin only)
export async function createUser(data: CreateUserRequest): Promise<User> {
  const response = await apiClient.post<User>('/users', data);
  return response.data;
}

// Update user (admin or self)
export async function updateUser(id: number, data: UpdateUserRequest): Promise<User> {
  const response = await apiClient.put<User>(`/users/${id}`, data);
  return response.data;
}

// Delete user (admin or self, with restrictions)
export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
