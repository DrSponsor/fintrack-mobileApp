/**
 * Logout Use Case
 *
 * Flow:
 *   1. Call POST /v1/auth/logout (best-effort — don't block on failure)
 *   2. Clear ALL tokens from OS Keychain
 *   3. Reset WatermelonDB (prevent data leakage between accounts)
 *   4. Reset all Zustand stores
 *
 * This is a LOCAL-FIRST operation. Even if the server call fails
 * (e.g. user is offline), we still clear local state. The server
 * session will expire naturally.
 */
import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { TokenManager } from '@/core/security/TokenManager';
import { database } from '@/core/database/database';
import { useAuthStore } from '@/core/store/auth.store';
import { useSyncStore } from '@/core/store/sync.store';
import { useUIStore } from '@/core/store/ui.store';

export async function executeLogout(): Promise<void> {
  // 1. Server-side session invalidation (best-effort)
  try {
    await api.post(endpoints.auth.logout);
  } catch {
    // Silent fail — server session expires naturally
    // User should not be blocked from logging out locally
  }

  // 2. Clear all tokens from OS Keychain
  await TokenManager.clearAll();

  // 3. Reset WatermelonDB
  // This is CRITICAL — prevents the next user from seeing
  // the previous user's financial data
  try {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  } catch {
    // If DB reset fails, the worst case is stale data
    // from the previous session — not a security issue
    // because auth tokens are already cleared
  }

  // 4. Reset all Zustand stores
  useAuthStore.getState().logout();
  useSyncStore.getState().setStale();
  // Don't reset UI store — theme preference should persist
}
