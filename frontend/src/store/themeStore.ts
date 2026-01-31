import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggleTheme: () => set((state) => {
        const newIsDark = !state.isDark;
        // Apply data-theme attribute to <html>
        if (newIsDark) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
        return { isDark: newIsDark };
      }),
    }),
    {
      name: 'go-notes-theme',
      onRehydrateStorage: () => (state) => {
        // Ensure correct theme is applied on page load
        if (state?.isDark) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      },
    }
  )
);
