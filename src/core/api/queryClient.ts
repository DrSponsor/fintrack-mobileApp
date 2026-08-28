/**
 * The shared QueryClient.
 *
 * The library was already a dependency and nothing mounted a provider, so
 * every screen hand-rolled its own request state. That is fine once and a
 * liability by the third time: the parts people write themselves — a guard
 * against overlapping requests, a generation counter so a stale response
 * cannot overwrite a fresh one, de-duplicating rows across pages — are exactly
 * the parts that are subtle, and exactly the parts this library has already
 * solved and tested.
 *
 * ── The defaults, and why they are not the library's ─────────────────────
 *
 *   RETRY IS OFF FOR MUTATIONS AND LIMITED FOR READS. The default retries
 *   three times with backoff. On a read that is a courtesy; on a financial
 *   mutation it is a way to post the same money twice, and the backend's
 *   Idempotency-Key is the only thing standing between a flaky connection and
 *   a duplicate transaction. Reads retry twice; writes never retry on their
 *   own — the screen decides, because only the screen knows whether the user
 *   has been told what happened.
 *
 *   NOTHING RETRIES ON A 4xx. A 401, a 403 or a validation failure is not a
 *   transient condition, and retrying it three times just delays the message
 *   the user needs by several seconds.
 *
 *   STALE TIME IS 30 SECONDS, NOT ZERO. The default treats every cached value
 *   as immediately stale, which on a tab bar means a refetch every time
 *   somebody switches tabs. Thirty seconds is long enough to make tab
 *   switching feel instant and short enough that money is never meaningfully
 *   out of date — and an explicit refetch after recording something bypasses
 *   it anyway.
 */
import { QueryClient } from '@tanstack/react-query';
import { readApiError } from './client';
import { useAuthStore } from '@/core/store/auth.store';

/** HTTP status carried on an Axios error, when there is one. */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const response = (error as { response?: { status?: number } }).response;
  return response?.status;
}

/**
 * Retry only what is worth retrying.
 *
 * A request that never reached the server is the case retrying actually helps.
 * Anything the server answered with a 4xx is a decision, not a hiccup.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  const status = statusOf(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  // A null envelope means the request never got an answer — a timeout or no
  // connection. That is the retryable case.
  return readApiError(error) === null || status === undefined || status >= 500;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 30_000,
      // React Native has no window to focus; expo-router's own focus effect is
      // what screens use, so leaving this on would only add a listener that
      // never fires.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Empties the cache whenever the signed-in identity changes.
 *
 * ── The bug this exists for ──────────────────────────────────────────────
 * The client is a module singleton, so it outlives a session. Signing out and
 * into a different account left the previous user's answers cached, and
 * because `accounts` is read with a one-hour staleTime while the month is not,
 * the dashboard rendered a SPLIT of two people: the new user's empty month
 * under the previous user's balance and account count. Someone was shown
 * ₦1,284,500.00 that was not theirs.
 *
 * ── Why here rather than in the logout path ──────────────────────────────
 * Three separate places end or change a session — the logout use case, the
 * refresh interceptor's forced logout, and login/register starting a new one —
 * and a fourth will be added eventually. Clearing at each is a rule someone
 * has to remember. Watching the identity itself is a rule nobody can forget,
 * and it covers paths that do not exist yet.
 *
 * ── It is still not the only defence ─────────────────────────────────────
 * Query keys are scoped by user id as well. This clear runs synchronously when
 * the store is written, so it lands before the next screen mounts — but the
 * cost of being wrong here is showing one person another person's money, and
 * that deserves a structural guarantee rather than an ordering argument.
 */
export function installSessionCacheReset(): () => void {
  let previous: string | null = null;

  return useAuthStore.subscribe((state) => {
    const current = state.user?.id ?? null;
    if (current === previous) return;
    previous = current;
    // On sign-out as well as sign-in: leaving a signed-out user's financial
    // data resident in memory is its own problem, separate from the leak.
    queryClient.clear();
  });
}
