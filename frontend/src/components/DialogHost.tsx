import ConfirmModal from './ConfirmModal';
import { useDialogStore } from '../store/dialogStore';

/** Renders confirmDialog() and notify() requests. Mount once, near the root. */
export default function DialogHost() {
  const confirms = useDialogStore((state) => state.confirms);
  const toasts = useDialogStore((state) => state.toasts);
  const resolveConfirm = useDialogStore((state) => state.resolveConfirm);
  const dismissToast = useDialogStore((state) => state.dismissToast);

  // One confirmation at a time; any others wait their turn
  const current = confirms[0];

  return (
    <>
      {current && (
        <ConfirmModal
          key={current.id}
          isOpen
          title={current.title}
          message={current.message}
          confirmText={current.confirmText}
          cancelText={current.cancelText}
          isDangerous={current.isDangerous}
          onConfirm={() => resolveConfirm(current.id, true)}
          onCancel={() => resolveConfirm(current.id, false)}
        />
      )}

      <div className="toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.kind}`}
            role={toast.kind === 'error' ? 'alert' : 'status'}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {toast.kind === 'error' ? 'error' : 'info'}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button
              className="icon-btn toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
