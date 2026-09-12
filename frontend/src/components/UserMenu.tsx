import { useEffect, useRef, useState } from 'react';
import useAuthStore from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

interface UserMenuProps {
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function UserMenu({ onOpenSettings, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const { isDark, toggleTheme } = useThemeStore();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initial = user?.username?.charAt(0).toUpperCase() || '?';

  return (
    <div ref={rootRef} className="user-menu">
      <button
        className="avatar-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user?.username ?? 'user'}`}
        title={user?.username}
      >
        {initial}
      </button>

      {open && (
        <div role="menu" className="menu-popover">
          <div className="menu-label">
            Signed in as <strong>{user?.username}</strong>
          </div>
          <button
            role="menuitem"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
          >
            <span className="material-symbols-outlined">settings</span>
            Settings
          </button>
          <button role="menuitem" className="menu-item" onClick={toggleTheme}>
            <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="menu-divider" role="separator" />
          <button role="menuitem" className="menu-item menu-item--danger" onClick={onLogout}>
            <span className="material-symbols-outlined">logout</span>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
