import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  is_admin: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  isAuthenticated: boolean;
}

function readStoredUser(): User | null {
  // A malformed value would otherwise throw at import time and leave a blank page
  try {
    return JSON.parse(localStorage.getItem('auth_user') || 'null');
  } catch {
    localStorage.removeItem('auth_user');
    return null;
  }
}

const initialToken = localStorage.getItem('auth_token');

const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: readStoredUser(),

  // A plain field, not a getter: zustand copies state on every update, which
  // turns a getter into the value it had at copy time. As a getter this stayed
  // false after setAuth, and only looked right because LoginPage reloads the page.
  isAuthenticated: initialToken !== null,

  setAuth: (token: string, user: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
