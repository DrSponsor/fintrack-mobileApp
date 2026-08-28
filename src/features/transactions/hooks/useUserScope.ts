/**
 * The identity every user-owned query key is scoped by.
 *
 * ── Why keys carry a user at all ─────────────────────────────────────────
 * `installSessionCacheReset` empties the cache when the signed-in identity
 * changes, and that is the primary fix for the leak it documents. This is the
 * second half, and it exists because the two failures are not equally bad.
 *
 * A missed refetch shows stale data. A key collision shows ONE PERSON ANOTHER
 * PERSON'S MONEY — which is what happened: a new account's dashboard rendered
 * the previous account's balance and "Across 2 accounts" beneath its own empty
 * month, because `accounts` is cached for an hour and the key said nothing
 * about whose accounts they were.
 *
 * With the user in the key, a cross-user read is not something the clear has
 * to prevent in time. It cannot be expressed.
 *
 * ── Signed out is its own scope, not a missing one ───────────────────────
 * Returning `'anonymous'` rather than undefined keeps every key a well-formed
 * array. A key containing undefined is still a valid, SHARED key — which is
 * exactly the bug — so the signed-out case is given a name of its own instead
 * of a hole.
 */
import { useAuthStore } from '@/core/store/auth.store';

export const ANONYMOUS = 'anonymous';

export function useUserScope(): string {
  return useAuthStore((state) => state.user?.id ?? ANONYMOUS);
}
