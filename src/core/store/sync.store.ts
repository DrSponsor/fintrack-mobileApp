/**
 * Sync Store — Zustand
 *
 * Tracks sync engine status. Drives the SyncStatusBar in the UI.
 * 'synced' | 'syncing' | 'stale' — users always know the currency of their data.
 */
import { create } from 'zustand';

type SyncStatus = 'synced' | 'syncing' | 'stale' | 'offline' | 'error';

interface SyncState {
  readonly status: SyncStatus;
  readonly lastSyncAt: number | null;
  readonly pendingCount: number;
  readonly errorMessage: string | null;

  // Actions
  readonly setSyncing: () => void;
  readonly setSynced: () => void;
  readonly setStale: () => void;
  readonly setOffline: () => void;
  readonly setError: (message: string) => void;
  readonly setPendingCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'stale',
  lastSyncAt: null,
  pendingCount: 0,
  errorMessage: null,

  setSyncing: () =>
    set({ status: 'syncing', errorMessage: null }),

  setSynced: () =>
    set({
      status: 'synced',
      lastSyncAt: Date.now(),
      errorMessage: null,
    }),

  setStale: () =>
    set({ status: 'stale' }),

  setOffline: () =>
    set({ status: 'offline' }),

  setError: (errorMessage: string) =>
    set({ status: 'error', errorMessage }),

  setPendingCount: (pendingCount: number) =>
    set({ pendingCount }),
}));
