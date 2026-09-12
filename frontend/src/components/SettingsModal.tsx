import { useEffect } from 'react';
import UserManagement from './UserManagement';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Full screen on phones, centred dialog on desktop. */
  fullScreen: boolean;
}

export default function SettingsModal({ isOpen, onClose, fullScreen }: SettingsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`modal-backdrop${fullScreen ? ' modal-backdrop--full' : ''}`}
      // pointerdown rather than click, so a text selection dragged out of the
      // dialog doesn't close it
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className={`modal-panel${fullScreen ? ' modal-panel--full' : ''}`}
      >
        <div className="modal-header">
          <h2 id="settings-title">Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <UserManagement />
        </div>
      </div>
    </div>
  );
}
