import apiClient from './client';

export interface User {
  id: number;
  username: string;
  is_admin: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface SetupStatusResponse {
  completed: boolean;
}

// Check if setup is complete
export async function checkSetup(): Promise<boolean> {
  const response = await apiClient.get<SetupStatusResponse>('/setup');
  return response.data.completed;
}

// Create first admin user
export async function createAdmin(username: string, password: string): Promise<void> {
  await apiClient.post('/setup', { username, password });
}

// Login user
export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/login', { username, password });
  return response.data;
}
