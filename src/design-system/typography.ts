/**
 * Typography — the "Ledger" design language.
 *
 * Three voices, each with one job:
 *
 *   DISPLAY    Instrument Serif — hero amounts and screen titles. A high-
 *              contrast serif evokes engraved banknotes and certificates, and
 *              almost no finance app uses one. It is the single decision that
 *              does most to stop the interface reading as a template.
 *
 *   UI         Plus Jakarta Sans — everything interactive and everything read
 *              in bulk. Neutral on purpose: the display face carries the
 *              personality so the workhorse doesn't have to.
 *
 *   TECHNICAL  JetBrains Mono — account numbers, reference IDs, timestamps.
 *              Deliberately NOT used for money. It is a code face, and setting
 *              currency in it makes money look like terminal output.
 *
 * ── Two corrections baked into this file ──────────────────────────────────
 *
 * 1. NO `fontWeight` ANYWHERE. With static per-weight font files, the weight is
 *    already in the file. Passing fontWeight alongside a custom fontFamily
 *    makes Android synthesise a bold on top of an already-bold face, which
 *    renders smeared. Choose the family; never restate the weight.
 *
 *    (This was previously masked: scripts/download-fonts.js was fetching the
 *    same VARIABLE font file for all five Plus Jakarta Sans weights, so every
 *    weight rendered identically at the default instance and the hierarchy was
 *    silently flat. Static instances are now mandatory — the script verifies
 *    the files are distinct and fails if they are not.)
 *
 * 2. OPTICAL TRACKING. Letter-spacing tightens as size grows and loosens as it
 *    shrinks, because large type looks loose at neutral tracking and small type
 *    looks cramped. Uniform tracking across a scale is one of the clearest
 *    tells of a system nobody tuned. Ratios below are of the font size; React
 *    Native takes letterSpacing in points, so they are pre-multiplied.
 */
import { TextStyle } from 'react-native';

export const fontFamilies = {
  /** Instrument Serif — Regular and Italic only. The family has no bold, which
   *  is correct: at display sizes a high-contrast serif does not need one. */
  display: 'InstrumentSerif-Regular',
  displayItalic: 'InstrumentSerif-Italic',

  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',

  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
} as const;

/** Applied to every style that can contain a figure that changes. Keeps digit
 *  columns from shifting as values update — which is also what makes the
 *  per-digit odometer possible. */
const tabular: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

export const typography = {
  // ── Display voice ───────────────────────────────────────────────────────

  /** 64 / −3% — the balance hero. Leading is set to 1.0: monumental numbers
   *  want the line box tight around them. */
  monument: {
    fontFamily: fontFamilies.display,
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -1.92,
    ...tabular,
  },

  /** 40 / −2% — secondary large amounts and full-bleed moments. */
  display: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
    ...tabular,
  },

  /** 28 / −1.5% — screen titles. Gives every screen an editorial masthead
   *  rather than a bold sans header. */
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.42,
  },

  // ── UI voice ────────────────────────────────────────────────────────────

  /** 20 / −1% — section headings. */
  heading: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },

  /** 16 / −0.5% — card and row titles. */
  subheading: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.08,
  },

  /** 15 — body copy. */
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0,
  },

  /** 15 — emphasised body. */
  bodyStrong: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0,
  },

  /** 15 — button text. */
  button: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  /** 12 / +2%, uppercase — field labels, metadata, badges. The positive
   *  tracking and caps are the editorial counterweight to the tight display
   *  type; the contrast between the two is where the voice comes from. */
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.24,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },

  /** 12 — same size as `label` but sentence case, for supporting text that
   *  shouldn't shout. */
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0,
  },

  /** 11 / +3%, uppercase — the finest print. */
  micro: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.33,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },

  // ── Technical voice ─────────────────────────────────────────────────────

  /** 13 — account numbers, reference IDs, timestamps. Never money. */
  technical: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    ...tabular,
  },

  /** 11 — dense technical metadata. */
  technicalSmall: {
    fontFamily: fontFamilies.mono,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0,
    ...tabular,
  },

  // ── Money ───────────────────────────────────────────────────────────────
  // Separate from the scale above because amounts are the most-read element in
  // the app and deserve their own tuned steps. All tabular.

  /** Ledger row amounts — the right-aligned column. */
  amountRow: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.08,
    ...tabular,
  },

  /** Amounts inline in a sentence. */
  amountInline: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
    ...tabular,
  },
} as const;

/* eslint-disable @typescript-eslint/no-require-imports */
export const fontAssets = {
  'InstrumentSerif-Regular': require('../../assets/fonts/InstrumentSerif-Regular.ttf'),
  'InstrumentSerif-Italic': require('../../assets/fonts/InstrumentSerif-Italic.ttf'),
  'PlusJakartaSans-Regular': require('../../assets/fonts/PlusJakartaSans-Regular.ttf'),
  'PlusJakartaSans-Medium': require('../../assets/fonts/PlusJakartaSans-Medium.ttf'),
  'PlusJakartaSans-SemiBold': require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'PlusJakartaSans-Bold': require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
  'PlusJakartaSans-ExtraBold': require('../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  'JetBrainsMono-Regular': require('../../assets/fonts/JetBrainsMono-Regular.ttf'),
  'JetBrainsMono-Medium': require('../../assets/fonts/JetBrainsMono-Medium.ttf'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */
