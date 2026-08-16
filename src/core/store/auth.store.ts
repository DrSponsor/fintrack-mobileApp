/**
 * Auth Store — Zustand
 *
 * Holds authentication state and user info.
 * This is ephemeral app state — NOT persistent data.
 * Tokens live in Keychain, user data lives in the backend.
 */
import { create } from 'zustand';

export type UserTier = 'FREE' | 'PRO';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly tier: UserTier;
  readonly googleId?: string;
  readonly createdAt: string;
}

interface AuthState {
  readonly isLoggedIn: boolean;
  readonly isLoading: boolean;
  readonly user: AuthUser | null;
  readonly tier: UserTier;

  // Actions
  readonly setUser: (user: AuthUser) => void;
  readonly setTier: (tier: UserTier) => void;
  readonly setLoading: (loading: boolean) => void;
  readonly markAuthenticated: () => void;
  readonly logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  isLoading: true, // Start loading — check Keychain for existing session
  user: null,
  tier: 'FREE',

  setUser: (user: AuthUser) =>
    set({
      isLoggedIn: true,
      isLoading: false,
      user,
      tier: user.tier,
    }),

  setTier: (tier: UserTier) =>
    set({ tier }),

  setLoading: (isLoading: boolean) =>
    set({ isLoading }),

  // A valid token exists (confirmed by the caller) but the profile fetch
  // that would populate `user` failed transiently (network blip, 5xx —
  // not an auth failure). Per "offline is the default state," this must
  // not evict the session. Screens render from WatermelonDB cache and the
  // caller is expected to retry the profile fetch later (foreground
  // refresh / pull-to-refresh) rather than block the user out.
  markAuthenticated: () =>
    set({ isLoggedIn: true, isLoading: false }),

  logout: () =>
    set({
      isLoggedIn: false,
      isLoading: false,
      user: null,
      tier: 'FREE',
    }),
}));
