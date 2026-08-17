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
import { useEffect, useState } from 'react';
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

/**
 * Whether the user has asked the OS to reduce motion.
 *
 * Respecting this is not optional: for people with vestibular disorders, the
 * large translating and rolling animations this design language leans on can
 * cause genuine nausea. Components that move things a meaningful distance
 * should collapse to an opacity change when this is true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduced(enabled);
      })
      .catch(() => {
        // Query failure should never disable the interface — fall back to
        // full motion, matching the OS default.
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduced(enabled);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
