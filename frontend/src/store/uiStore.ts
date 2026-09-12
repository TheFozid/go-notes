import { create } from 'zustand';

const SIDEBAR_OPEN_KEY = 'go-notes-sidebar-open';
const SIDEBAR_WIDTH_KEY = 'go-notes-sidebar-width';

export const SIDEBAR_MIN = 150;
export const SIDEBAR_MAX = 600;
const SIDEBAR_DEFAULT = 280;

export function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, width));
}

function readStoredWidth(): number {
  const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
  return stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX ? stored : SIDEBAR_DEFAULT;
}

/*
 * Desktop and mobile track their open state separately: the desktop choice is
 * remembered between sessions, while the mobile drawer always starts closed.
 * This lives in a store rather than App state so tree rows can close the drawer
 * on tap without threading callbacks through every node component.
 */
interface UIState {
  desktopSidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  sidebarWidth: number;
  toggleDesktopSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  persistSidebarWidth: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  desktopSidebarOpen: localStorage.getItem(SIDEBAR_OPEN_KEY) === 'true',
  mobileSidebarOpen: false,
  sidebarWidth: readStoredWidth(),

  toggleDesktopSidebar: () =>
    set((state) => {
      const desktopSidebarOpen = !state.desktopSidebarOpen;
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(desktopSidebarOpen));
      return { desktopSidebarOpen };
    }),

  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

  closeMobileSidebar: () => {
    if (get().mobileSidebarOpen) set({ mobileSidebarOpen: false });
  },

  setSidebarWidth: (width) => set({ sidebarWidth: clampSidebarWidth(width) }),

  // Written once a drag finishes rather than on every pointer move
  persistSidebarWidth: () =>
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(get().sidebarWidth)),
}));
