/**
 * The one-time value that ties a returning authorisation code to the request
 * this app actually made.
 *
 * ── Why this is not a ref ────────────────────────────────────────────────
 * It was, and that was wrong in a way only a device shows. Sending the user to
 * Google means leaving the app: Android is free to kill a backgrounded process
 * while the browser is in front, and on a low-memory phone it routinely does.
 * The app is then started COLD by the incoming deep link, every ref is gone,
 * and a perfectly valid code fails its state check — reported to the user as
 * "that sign-in did not match this request", which sounds like tampering
 * rather than the ordinary thing that just happened.
 *
 * So it lives where it survives the process. MMKV rather than SecureStore
 * because it is not a secret: it is a nonce whose only job is to be echoed
 * back, and it is worthless to anyone who cannot also intercept the redirect.
 *
 * ── Read once, then gone ─────────────────────────────────────────────────
 * `takePendingState` clears as it reads. A state that stayed behind after a
 * completed exchange would validate a SECOND code arriving later — which is
 * the replay this value exists to prevent.
 */
import { storage } from '@/core/storage/mmkv';

const KEY = 'connect.oauth.pending-state';

export function rememberPendingState(state: string): void {
  storage.set(KEY, state);
}

/** Returns the pending state and clears it. Null when there is none. */
export function takePendingState(): string | null {
  const value = storage.getString(KEY);
  if (value === undefined) return null;
  storage.delete(KEY);
  return value;
}

export function clearPendingState(): void {
  storage.delete(KEY);
}
