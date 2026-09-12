import { create } from 'zustand';

/*
 * In-page replacements for window.confirm() and window.alert().
 *
 * The native dialogs only appear if the host shows them. Browsers and Electron
 * do; the Android WebView app doesn't, so confirm() silently returns false and
 * alert() shows nothing. These render inside the page instead, so they behave
 * the same everywhere. <DialogHost /> (mounted once in App.tsx) draws them.
 */

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  id: number;
  resolve: (confirmed: boolean) => void;
}

export interface Toast {
  id: number;
  message: string;
  kind: 'error' | 'info';
}

interface DialogState {
  confirms: PendingConfirm[];
  toasts: Toast[];
  resolveConfirm: (id: number, confirmed: boolean) => void;
  dismissToast: (id: number) => void;
}

let nextId = 1;
const TOAST_DURATION_MS = 6000;

export const useDialogStore = create<DialogState>((set, get) => ({
  confirms: [],
  toasts: [],

  resolveConfirm: (id, confirmed) => {
    const pending = get().confirms.find((c) => c.id === id);
    if (!pending) return; // already answered
    set((state) => ({ confirms: state.confirms.filter((c) => c.id !== id) }));
    pending.resolve(confirmed);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Resolves true if the user confirms, false if they cancel or dismiss. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const pending: PendingConfirm = { ...options, id: nextId++, resolve };
    useDialogStore.setState((state) => ({ confirms: [...state.confirms, pending] }));
  });
}

/** Non-blocking message at the bottom of the screen that clears itself. */
export function notify(message: string, kind: Toast['kind'] = 'info'): void {
  const id = nextId++;
  useDialogStore.setState((state) => ({ toasts: [...state.toasts, { id, message, kind }] }));
  window.setTimeout(() => useDialogStore.getState().dismissToast(id), TOAST_DURATION_MS);
}

export function notifyError(message: string): void {
  notify(message, 'error');
}
