/**
 * FinTrack Theme Definitions
 *
 * Dark theme is primary (most Nigerian users prefer dark mode for
 * AMOLED battery savings and visual comfort). Light theme available
 * for user preference.
 */
import { colors, spacing, radius, shadows, animation } from './tokens';
import { typography } from './typography';

export interface FinTrackTheme {
  readonly dark: boolean;
  readonly colors: {
    readonly bg: typeof colors.bg | typeof colors.light.bg;
    readonly accent: typeof colors.accent;
    readonly text: typeof colors.text | typeof colors.light.text;
    readonly border: typeof colors.border | typeof colors.light.border;
  };
  readonly spacing: typeof spacing;
  readonly radius: typeof radius;
  readonly shadows: typeof shadows;
  readonly typography: typeof typography;
  readonly animation: typeof animation;
}

export const darkTheme: FinTrackTheme = {
  dark: true,
  colors: {
    bg: colors.bg,
    accent: colors.accent,
    text: colors.text,
    border: colors.border,
  },
  spacing,
  radius,
  shadows,
  typography,
  animation,
} as const;

export const lightTheme: FinTrackTheme = {
  dark: false,
  colors: {
    bg: colors.light.bg,
    accent: colors.accent,
    text: colors.light.text,
    border: colors.light.border,
  },
  spacing,
  radius,
  shadows,
  typography,
  animation,
} as const;
