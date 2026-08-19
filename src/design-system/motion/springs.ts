/**
 * Motion helpers — the "Ledger" design language.
 *
 * One physics model, three tunings. Everything in this app either springs with
 * one of these configs or uses one of the token easing curves; nothing uses a
 * linear or library-default ease, because a uniform default ease across an
 * interface is one of the clearest signals that nobody tuned the motion.
 *
 * Import these rather than writing spring configs inline, so the whole app's
 * sense of weight can be adjusted from tokens.ts.
 */
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';
import { motion } from '../tokens';

/** ζ ≈ 0.73 — slight overshoot. Buttons, toggles, chips. */
export const SNAP: WithSpringConfig = motion.spring.snap;

/** ζ ≈ 0.89 — no meaningful overshoot. The default for most things. */
export const SETTLE: WithSpringConfig = motion.spring.settle;

/** ζ ≈ 1.51 — overdamped and weighty. Large surfaces, the balance hero. */
export const DRIFT: WithSpringConfig = motion.spring.drift;

const [outX1, outY1, outX2, outY2] = motion.easing.out;
const [inX1, inY1, inX2, inY2] = motion.easing.in;
const [ioX1, ioY1, ioX2, ioY2] = motion.easing.inOut;

/** Decelerating — content entering the screen. */
export const easeOut = Easing.bezier(outX1, outY1, outX2, outY2);
/** Accelerating — content leaving the screen. */
export const easeIn = Easing.bezier(inX1, inY1, inX2, inY2);
/** Symmetric — movement between two on-screen positions. */
export const easeInOut = Easing.bezier(ioX1, ioY1, ioX2, ioY2);

export const timing = {
  instant: { duration: motion.duration.instant, easing: easeOut } satisfies WithTimingConfig,
  quick: { duration: motion.duration.quick, easing: easeOut } satisfies WithTimingConfig,
  base: { duration: motion.duration.base, easing: easeOut } satisfies WithTimingConfig,
  slow: { duration: motion.duration.slow, easing: easeOut } satisfies WithTimingConfig,
} as const;

// ── Reduced motion ────────────────────────────────────────────────────────
//
// ONE OS subscription for the whole app, shared by every caller.
//
// This previously opened a listener per component. That reads as harmless until
// you count: `Reveal` calls it, and a single screen mounts a dozen Reveals, so
// the dashboard alone registered about twelve `reduceMotionChanged` listeners
// plus twelve `isReduceMotionEnabled()` round trips to the native side — and
// every one of them resolved into its own setState and its own re-render, on
// mount, on the first screen after login.
//
// The state is global to the device, so it belongs in one place. `subscribe`
// lazily opens the real listener on first use and every consumer shares it.

let reducedMotionEnabled = false;
let osSubscriptionOpen = false;
const reducedMotionListeners = new Set<() => void>();

function notifyReducedMotion(): void {
  reducedMotionListeners.forEach((listener) => listener());
}

function openOsSubscription(): void {
  if (osSubscriptionOpen) return;
  osSubscriptionOpen = true;

  AccessibilityInfo.isReduceMotionEnabled()
    .then((enabled) => {
      if (enabled === reducedMotionEnabled) return;
      reducedMotionEnabled = enabled;
      notifyReducedMotion();
    })
    .catch(() => {
      // A failed query must never disable the interface — fall back to full
      // motion, which is the OS default anyway.
    });

  // Deliberately never removed. The listener is process-wide and costs one
  // registration; tearing it down when the last component unmounts only means
  // paying to open it again on the next screen.
  AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    if (enabled === reducedMotionEnabled) return;
    reducedMotionEnabled = enabled;
    notifyReducedMotion();
  });
}

function subscribeReducedMotion(listener: () => void): () => void {
  openOsSubscription();
  reducedMotionListeners.add(listener);
  return () => {
    reducedMotionListeners.delete(listener);
  };
}

function getReducedMotion(): boolean {
  return reducedMotionEnabled;
}

/**
 * Whether the user has asked the OS to reduce motion.
 *
 * Respecting this is not optional: for people with vestibular disorders, the
 * large translating and rolling animations this design language leans on can
 * cause genuine nausea. Components that move things a meaningful distance
 * should collapse to an opacity change when this is true.
 *
 * `useSyncExternalStore` rather than useState+useEffect, so every consumer
 * reads one shared value and React handles the tearing and subscription
 * lifecycle correctly.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotion,
  );
}
