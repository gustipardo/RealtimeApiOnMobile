import { create } from 'zustand';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface ConnectionStore {
  connectionState: ConnectionState;
  reconnectAttempts: number;
  networkStatus: 'online' | 'offline';
  setConnectionState: (state: ConnectionState) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setNetworkStatus: (status: 'online' | 'offline') => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  connectionState: 'disconnected',
  reconnectAttempts: 0,
  networkStatus: 'online',

  setConnectionState: (connectionState) => set({ connectionState }),

  incrementReconnectAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),

  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

  setNetworkStatus: (networkStatus) => set({ networkStatus }),
}));
