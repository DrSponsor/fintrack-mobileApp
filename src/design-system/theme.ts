/**
 * Theme — the "Ledger" design language.
 *
 * Dark-only, by decision. The palette, the material layer (the atmospheric
 * wash) and the elevation model are all built specifically for a near-black
 * chromatic ground; a light theme is not a recolour of this one, it is a
 * separate design problem. Shipping a half-considered light mode is a reliable
 * way to look cheap, so it is deferred to its own pass rather than stubbed.
 *
 * Practical consequence: do not build a theme toggle in Settings until a light
 * theme actually exists.
 */
import { colors, spacing, radius, shadow, motion, material } from './tokens';
import { typography } from './typography';

export interface AppTheme {
  readonly colors: typeof colors;
  readonly spacing: typeof spacing;
  readonly radius: typeof radius;
  readonly shadow: typeof shadow;
  readonly typography: typeof typography;
  readonly motion: typeof motion;
  readonly material: typeof material;
}

export const theme: AppTheme = {
  colors,
  spacing,
  radius,
  shadow,
  typography,
  motion,
  material,
} as const;
