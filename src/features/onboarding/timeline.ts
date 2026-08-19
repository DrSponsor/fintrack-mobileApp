/**
 * Timeline helpers for the onboarding stages.
 *
 * Every stage runs on ONE master clock — a single shared value looping 0→1 —
 * and each element derives its own sub-animation from a slice of it. That is
 * why the sequences stay in sync no matter when a slide becomes visible, and
 * why adding an element costs one interpolation rather than another timer that
 * can drift against the others.
 *
 * The master clock is deliberately linear. Easing belongs to each element's
 * slice, not to the clock, otherwise every element inherits the same curve and
 * the whole stage moves as one rigid block.
 */

/**
 * Maps the master clock onto a phase, clamped to 0-1 outside it.
 *
 * `phase(p, 0.2, 0.5)` is 0 before 20%, ramps across the middle, and holds at 1
 * after 50%.
 */
export function phase(clock: number, start: number, end: number): number {
  'worklet';
  if (end <= start) return clock >= end ? 1 : 0;
  const t = (clock - start) / (end - start);
  return Math.min(1, Math.max(0, t));
}

/** Decelerating. Things arriving. */
export function easeOut(t: number): number {
  'worklet';
  return 1 - Math.pow(1 - t, 3);
}

/** Accelerating. Things leaving. */
export function easeIn(t: number): number {
  'worklet';
  return t * t * t;
}

/** Symmetric. Things travelling between two on-screen positions. */
export function easeInOut(t: number): number {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Ramps 0→1→0 across a phase — for anything that appears and then leaves
 * again, like a sweep or a flash, without needing two separate phases.
 */
export function pulse(t: number): number {
  'worklet';
  return Math.sin(t * Math.PI);
}
