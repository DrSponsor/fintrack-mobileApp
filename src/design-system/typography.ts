/**
 * FinTrack Typography System
 *
 * Primary: Plus Jakarta Sans — premium geometric fintech aesthetic
 * Monospace: JetBrains Mono — account numbers, amounts in tables
 *
 * Font files loaded via expo-font in the root layout.
 * The fontAssets map below is passed directly to useFonts().
 */
import { TextStyle } from 'react-native';

// ── Font family names (must match the keys in fontAssets) ──────
export const fontFamilies = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
} as const;

/**
 * Typography scale — matches the architecture spec.
 *
 * Usage:
 *   import { typography } from '@/design-system/typography'
 *   <Text style={typography.h1}>Dashboard</Text>
 */
export const typography = {
  /** Display — big numbers (transaction amounts, totals). fontSize: 36 */
  display: {
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -1,
    lineHeight: 44,
  },

  /** H1 — screen titles. fontSize: 24 */
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
    lineHeight: 32,
  },

  /** H2 — section titles. fontSize: 20 */
  h2: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
    lineHeight: 28,
  },

  /** H3 — card titles. fontSize: 16 */
  h3: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 24,
  },

  /** Body — standard body text. fontSize: 15 */
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
  },

  /** Body medium — emphasized body. fontSize: 15 */
  bodyMedium: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 22,
  },

  /** Label — metadata, timestamps, badges. fontSize: 12 */
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.3,
    lineHeight: 16,
  },

  /** Label large — slightly bigger labels. fontSize: 13 */
  labelLarge: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
    lineHeight: 18,
  },

  /** Mono — account numbers, amounts in tables. fontSize: 14 */
  mono: {
    fontFamily: fontFamilies.mono,
    fontSize: 14,
    lineHeight: 20,
  },

  /** Mono display — large monospace amounts. fontSize: 32 */
  monoDisplay: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },

  /** Button — button text. fontSize: 15 */
  button: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
    lineHeight: 20,
  },

  /** Caption — small supporting text. fontSize: 11 */
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 14,
  },
} as const;

/**
 * Font assets to load via expo-font.
 * Used in the root _layout.tsx via useFonts().
 *
 * The keys become the font family names used in fontFamilies above.
 * eslint-disable-next-line is needed because require() is the only
 * way to reference bundled font assets in React Native.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const fontAssets = {
  'PlusJakartaSans-Regular': require('../../assets/fonts/PlusJakartaSans-Regular.ttf'),
  'PlusJakartaSans-Medium': require('../../assets/fonts/PlusJakartaSans-Medium.ttf'),
  'PlusJakartaSans-SemiBold': require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'PlusJakartaSans-Bold': require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
  'PlusJakartaSans-ExtraBold': require('../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  'JetBrainsMono-Regular': require('../../assets/fonts/JetBrainsMono-Regular.ttf'),
  'JetBrainsMono-Medium': require('../../assets/fonts/JetBrainsMono-Medium.ttf'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */
