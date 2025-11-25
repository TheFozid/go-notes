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
  const response = await apiClient.get<User[]>('/users/');  // Add trailing slash
  return response.data;
}

// Create user (admin only)
export async function createUser(data: CreateUserRequest): Promise<User> {
  const response = await apiClient.post<User>('/users/', data);  // Add trailing slash
  return response.data;
}

// Update user (admin or self)
export async function updateUser(id: number, data: UpdateUserRequest): Promise<User> {
  const response = await apiClient.put<User>(`/users/${id}/`, data);  // Add trailing slash (also fix your template literal syntax error here - you have backtick instead of parenthesis)
  return response.data;
}

// Delete user (admin or self, with restrictions)
export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}/`);  // Add trailing slash (also fix template literal)
}
