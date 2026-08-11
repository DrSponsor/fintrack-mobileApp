/**
 * UI Store — Zustand with MMKV Persistence
 *
 * Ephemeral UI state: theme preference, modal visibility, etc.
 * NOT for data — data lives in WatermelonDB.
 *
 * Theme preference and balance visibility persist across restarts
 * via MMKV (fast, synchronous, non-sensitive).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvZustandStorage } from '../storage/mmkv';

type ThemePreference = 'system' | 'dark' | 'light';

interface UIState {
  readonly themePreference: ThemePreference;
  readonly isProGateVisible: boolean;
  readonly proGateFeature: string | null;
  readonly isBalanceHidden: boolean;
  readonly lastActiveAt: number | null;
  readonly hasCompletedOnboarding: boolean;

  // Actions
  readonly setThemePreference: (pref: ThemePreference) => void;
  readonly showProGate: (feature: string) => void;
  readonly hideProGate: () => void;
  readonly toggleBalanceVisibility: () => void;
  readonly setLastActiveAt: (timestamp: number) => void;
  readonly setOnboardingComplete: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      isProGateVisible: false,
      proGateFeature: null,
      isBalanceHidden: false,
      lastActiveAt: null,
      hasCompletedOnboarding: false,

      setThemePreference: (themePreference: ThemePreference) =>
        set({ themePreference }),

      showProGate: (feature: string) =>
        set({ isProGateVisible: true, proGateFeature: feature }),

      hideProGate: () =>
        set({ isProGateVisible: false, proGateFeature: null }),

      toggleBalanceVisibility: () =>
        set((state) => ({ isBalanceHidden: !state.isBalanceHidden })),

      setLastActiveAt: (lastActiveAt: number) =>
        set({ lastActiveAt }),

      setOnboardingComplete: () =>
        set({ hasCompletedOnboarding: true }),
    }),
    {
      name: 'fintrack-ui-preferences',
      storage: createJSONStorage(() => mmkvZustandStorage),
      // Only persist user preferences — not ephemeral modal state
      partialize: (state) => ({
        themePreference: state.themePreference,
        isBalanceHidden: state.isBalanceHidden,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    },
  ),
);
