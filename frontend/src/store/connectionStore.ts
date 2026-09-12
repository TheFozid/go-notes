import { create } from 'zustand';

/*
 * The collaboration status lives outside QuillEditor so the top bar can show it.
 * 'loading' covers fetching the note and waiting for the first sync, during
 * which the editor is read-only.
 */
export type ConnectionStatus = 'idle' | 'loading' | 'connected' | 'connecting' | 'offline';

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));

export const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  idle: '',
  loading: 'Opening note',
  connected: 'Synced',
  connecting: 'Reconnecting',
  offline: 'Offline, changes saved locally',
};
