/**
 * Keys that make a submission safe to retry.
 *
 * ── Why this is not a crypto-random UUID ─────────────────────────────────
 * There is no `crypto.getRandomValues` in this runtime without a polyfill, and
 * this key does not need one. It is not a secret and it is not a
 * capability — the backend hashes it together with the authenticated user id
 * before use, so a key can only ever collide with another key belonging to the
 * SAME person. All it has to do is be unique among one user's own submissions,
 * which a millisecond timestamp plus a counter plus a random suffix satisfies
 * with room to spare.
 *
 * ── What the key is actually protecting against ──────────────────────────
 * A request that times out on a slow network has an unknown outcome: the money
 * may or may not have been recorded. Retrying with the same key lets the server
 * recognise the second request as the same submission and replay its original
 * answer instead of recording the payment twice.
 *
 * That gives the key two requirements which pull in opposite directions, and
 * getting either backwards is a real bug:
 *
 *   STABLE across retries of one submission. A fresh key on retry defeats the
 *   entire mechanism and doubles the user's money.
 *
 *   FRESH for a genuinely new submission — including re-sending with `force`
 *   after a duplicate warning. The server caches its response against the key,
 *   so reusing it there would replay "duplicate suspected" forever and the
 *   user's "record it anyway" would silently do nothing.
 */

let counter = 0;

/** Ordering, so keys from one session never collide within a millisecond. */
export function createIdempotencyKey(): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `me-${Date.now().toString(36)}-${counter.toString(36)}-${random}`;
}
