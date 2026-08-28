/**
 * Typography — the "Ledger" design language.
 *
 * TWO families, and the split between them is semantic, not decorative:
 *
 *   LANGUAGE   Plus Jakarta Sans — anything a person reads as words. Headlines
 *              run at ExtraBold with hard negative tracking, which is where the
 *              display personality now comes from: scale and weight contrast
 *              rather than a third typeface.
 *
 *   NUMBER     JetBrains Mono — every figure in the app without exception.
 *              Amounts, balances, percentages, dates, account numbers,
 *              reference IDs.
 *
 * ── Why every number is monospaced ────────────────────────────────────────
 * A ledger's whole job is comparison down a column, and that only works when
 * digits occupy identical widths — ₦12,500 and ₦98,300 must align on the naira,
 * the comma and the kobo. Proportional figures break that alignment even with
 * tabular-nums, because the currency mark and separators still shift.
 *
 * Setting numbers in a code face is a real trade: it costs some warmth, and it
 * only works if the surrounding language face is genuinely warm and the sizes
 * are tuned per-context rather than reused from the code defaults. That tuning
 * is the `Number voice` block below. The payoff is that the app's most-read
 * element gets its own unmistakable voice, and money stops looking like body
 * copy that happens to contain digits.
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
  // Language.
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',

  // Number.
  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
  monoSemiBold: 'JetBrainsMono-SemiBold',
  monoBold: 'JetBrainsMono-Bold',
} as const;

/** Applied to every style that can contain a figure that changes. Keeps digit
 *  columns from shifting as values update — which is also what makes the
 *  per-digit odometer possible. */
const tabular: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

export const typography = {
  // ── Number voice ────────────────────────────────────────────────────────
  // JetBrains Mono. Tracking is *negative and steep* here, unlike the code
  // editor defaults this face ships with: monospace sets every glyph on a wide
  // uniform advance, which at 56px leaves gaps you could park a car in. Pulling
  // it in hard is what turns a code face into a display face.

  // ── Leading on the mono styles is a correctness constraint ──────────────
  // These two previously ran at 1.00em and 1.12em, and both CLIPPED the tops
  // of their own figures on Android. It is worth stating why, because the
  // number that looks safe is not.
  //
  // JetBrains Mono declares ascender 1020 and descender 300 per 1000 em, so
  // its natural line box is 1.32em and the baseline sits 77.3% of the way
  // down it. Its lining figures stand 0.857em tall. A box only clears them
  // when 0.773 × lineHeight ≥ 0.857 × fontSize — that is, at 1.11em, before
  // any allowance for hinting. Anything tighter does not compress the line:
  // it slices the glyph tops off, and the cut is clean enough to read as a
  // typeface with flat-topped digits rather than as a bug.
  //
  // 1.20em is the floor used here, and every mono style below already clears
  // it. Tightness at display size belongs in letterSpacing, which is a
  // property of the type; leading is a property of the box, and starving the
  // box does not make the figures look gripped, it makes them look cropped.

  /** 56 — the balance hero. */
  monument: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 56,
    lineHeight: 68,
    letterSpacing: -3.36,
    ...tabular,
  },

  /** 34 — secondary large figures: gauge readouts, statement totals. */
  amountDisplay: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -1.7,
    ...tabular,
  },

  // ── Language voice ──────────────────────────────────────────────────────
  // Plus Jakarta Sans ExtraBold, tracked tight. The personality at display size
  // comes from weight and negative tracking, not from a separate face.

  /** 38 — headlines and full-bleed moments. */
  display: {
    fontFamily: fontFamilies.extraBold,
    fontSize: 38,
    lineHeight: 43,
    letterSpacing: -1.14,
  },

  /** 26 — screen titles. */
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.52,
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

  /** 15 — what the user types into a credential field: email addresses,
   *  passwords, one-time codes.
   *
   *  Set in the number face on purpose. An email address is an *identifier*,
   *  not language — nobody reads it for meaning, they check it character by
   *  character — and monospace is what makes that check easy: `rn` stops
   *  looking like `m`, `0` stops looking like `O`, and a stray space at the end
   *  becomes visible. It also gives the auth screens a texture that no boxed
   *  sans-serif form has, which is the point. */
  credential: {
    fontFamily: fontFamilies.mono,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.15,
    ...tabular,
  },

  // ── Money ───────────────────────────────────────────────────────────────
  // Amounts are the most-read element in the app, so they get their own tuned
  // steps rather than borrowing from the scale above. Monospaced, so a column
  // of them aligns on the naira mark, the thousands separators and the kobo.

  /** Ledger row amounts — the right-aligned column. Slightly smaller than the
   *  15px body it sits beside: monospace runs optically larger at equal point
   *  size, and matching the numbers to the label size makes the numbers shout. */
  amountRow: {
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.28,
    ...tabular,
  },

  /** Amounts inline in a sentence. */
  amountInline: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 13.5,
    lineHeight: 22,
    letterSpacing: -0.14,
    ...tabular,
  },
} as const;

/* eslint-disable @typescript-eslint/no-require-imports */
export const fontAssets = {
  'PlusJakartaSans-Regular': require('../../assets/fonts/PlusJakartaSans-Regular.ttf'),
  'PlusJakartaSans-Medium': require('../../assets/fonts/PlusJakartaSans-Medium.ttf'),
  'PlusJakartaSans-SemiBold': require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'PlusJakartaSans-Bold': require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
  'PlusJakartaSans-ExtraBold': require('../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  'JetBrainsMono-Regular': require('../../assets/fonts/JetBrainsMono-Regular.ttf'),
  'JetBrainsMono-Medium': require('../../assets/fonts/JetBrainsMono-Medium.ttf'),
  'JetBrainsMono-SemiBold': require('../../assets/fonts/JetBrainsMono-SemiBold.ttf'),
  'JetBrainsMono-Bold': require('../../assets/fonts/JetBrainsMono-Bold.ttf'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */
