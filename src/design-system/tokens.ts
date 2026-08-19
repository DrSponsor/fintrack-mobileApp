/**
 * Design tokens — the "Ledger" design language.
 *
 * Dark-only, by decision rather than omission. A half-designed light mode is a
 * reliable way to look cheap, so light mode is deferred to its own deliberate
 * pass rather than shipped as an afterthought.
 *
 * ── The two rules that carry most of the quality ──────────────────────────
 *
 * 1. COLOUR IS RESERVED FOR MONEY. There is no brand accent anywhere in this
 *    interface. Actions are paper-white, the ground and text are neutral, and
 *    the only chroma on screen is jade (money in), clay (money out) and the
 *    category hues inside a breakdown. Most finance apps give the brand a
 *    colour and then have to share it with income or alerts, which is exactly
 *    why their screens read muddy — the eye cannot tell "you can tap this"
 *    apart from "you received this". Here, if it has colour, it is money.
 *
 * 2. ELEVATION IS A HAIRLINE, NOT A SHADOW. On a near-black ground a drop
 *    shadow is close to invisible and mostly reads as smudge. Raised surfaces
 *    are instead marked by a 1px top-edge highlight — light catching the
 *    leading edge of a raised plane — plus a small step up the surface ramp.
 *    This is what makes dark surfaces look sculpted instead of flat.
 *
 * Every neutral is derived from a single indigo hue (~224°) with saturation
 * falling as lightness rises, which is how atmospheric perspective actually
 * behaves. Nothing here is a neutral grey; flat grey is what you get when
 * nobody made a decision.
 */

// ── Ground ────────────────────────────────────────────────────────────────
// One hue (~224°), saturation decreasing as the surface rises.
//
//   void   #05070C   h223 s41% l3%
//   base   #080B12   h222 s38% l5%
//   raised #0F131F   h225 s35% l9%
//   float  #171D2E   h224 s33% l14%
//   lifted #1E2539   h224 s31% l17%

const surface = {
  /** Behind modal sheets, and the true backdrop. */
  void: '#05070C',
  /** App background. */
  base: '#080B12',
  /** Cards and elevated surfaces. */
  raised: '#0F131F',
  /** Inputs and tertiary fills. */
  float: '#171D2E',
  /** Highest step — popovers, sheets over sheets. */
  lifted: '#1E2539',
} as const;

// ── Action ────────────────────────────────────────────────────────────────
// THE RULE THAT DEFINES THIS INTERFACE: colour is reserved for money. Nothing
// else is allowed to be coloured — not the primary button, not the brand mark,
// not the active tab, not a focus ring.
//
// This replaced a brass/gold accent. Warm gold on near-black is the single most
// generated-looking combination in software right now, and more importantly a
// brand accent competes with the money colours for the eye: if the button, the
// logo and an income figure are all warm, the user has to *read* to find out
// which one is telling them something about their money.
//
// So actions are paper. A warm off-white against the cool indigo ground reads
// as a printed slip laid on a dark desk — the temperature contrast does the
// work a hue would normally do, and leaves the entire chromatic range free to
// mean exactly one thing.

const action = {
  /** Primary action surface, and the brand mark. Warm (~40° at 8% sat) against
   *  a cool ground, which is what stops it reading as plain grey. */
  base: '#F0EDE6',
  /** Pressed. */
  deep: '#CFCAC0',
  /** Text and icons ON an action surface. */
  on: '#0A0D14',
  /** Tinted fill behind a selected/active row. Neutral, so it never competes
   *  with an amount sitting in the same row. */
  wash: 'rgba(240, 237, 230, 0.07)',
  washStrong: 'rgba(240, 237, 230, 0.12)',
} as const;

// ── Money ─────────────────────────────────────────────────────────────────
// Direction of money, never action. Contrast on surface.base: jade 6.74:1,
// clay 4.96:1 — both clear WCAG AA for text.

const money = {
  /** Inbound — credits, income. */
  inbound: '#46A883',
  /** Outbound — debits, spending. Deliberately a calm terracotta: spending is
   *  information, not failure, so it must not read as an error state. */
  outbound: '#C9614A',
  inboundWash: 'rgba(70, 168, 131, 0.10)',
  outboundWash: 'rgba(201, 97, 74, 0.10)',
} as const;

// ── Text ──────────────────────────────────────────────────────────────────
// Carries the same indigo undertone as the ground. Contrast ratios measured
// against surface.base (#080B12).

const text = {
  /** 16.8:1 — body and headings. */
  primary: '#ECEDF2',
  /** 6.21:1 — supporting text, comfortably AA at body size. */
  secondary: '#8A90A6',
  /** 3.77:1 — AA for large text (≥18.66px bold / ≥24px) and non-essential
   *  metadata only. Never use for body copy. */
  tertiary: '#646C84',
  /** Disabled controls only — exempt from contrast minimums, and must never
   *  carry information that exists nowhere else. */
  disabled: '#454B5E',
  /** On action surfaces and other light fills. */
  inverse: '#080B12',
} as const;

// ── Rules ─────────────────────────────────────────────────────────────────
// The ledger motif lives here. Drawn at StyleSheet.hairlineWidth.

const rule = {
  /** Top-edge highlight on a raised surface — see rule 2 in the header. */
  edge: 'rgba(255, 255, 255, 0.055)',
  /** Between ledger rows. Deliberately near-invisible; the rhythm should be
   *  felt more than seen. */
  faint: 'rgba(255, 255, 255, 0.045)',
  /** Section dividers. */
  default: 'rgba(255, 255, 255, 0.09)',
  /** Emphasis, input borders. */
  strong: 'rgba(255, 255, 255, 0.16)',
  /** Focused input, active row. Neutral — see the Action note above. */
  focus: 'rgba(240, 237, 230, 0.30)',
} as const;

// ── State ─────────────────────────────────────────────────────────────────
// Note there is deliberately NO warning amber. An amber warning would be the
// only warm hue on screen that is not money, which breaks the rule above.
// Escalation instead runs jade → clay → danger, which is both unambiguous and
// semantically right: "spending a lot" and "spending too much" are the same
// axis, so they should share a hue family.

const state = {
  /** A genuinely hot red, distinct from clay. 4.81:1 on surface.base. */
  danger: '#DC4B44',
  dangerWash: 'rgba(220, 75, 68, 0.10)',
  /** Caution — reuses clay. See note above. */
  warning: money.outbound,
  warningWash: money.outboundWash,
  /** 5.74:1 — sits in the indigo family so it harmonises rather than shouts. */
  info: '#4A90C9',
  infoWash: 'rgba(74, 144, 201, 0.10)',
  /** Success shares jade: a completed action and inbound money are the same
   *  "this went well" signal, and splitting them would add a hue for nothing. */
  success: money.inbound,
  successWash: money.inboundWash,
} as const;

// ── Category identity ─────────────────────────────────────────────────────
// Category colour is *identity*, not judgement, so this palette is deliberately
// kept clear of jade (~160°, inbound money) and clay (~14°, outbound), because
// a category rendering in a money colour would read as "this went well" rather
// than simply "this is groceries".
//
// Used for chips, dots and bars — never as the colour of an amount, which
// always keeps its money semantics.
//
// Jewel-toned rather than pastel: on a near-black indigo ground, pastels turn
// to mud. All sit around 60-68% lightness so no single category shouts over
// the others in a breakdown chart.

const category = {
  violet: '#8B7BD8',
  blue: '#5B92D4',
  cyan: '#4FA8B8',
  lime: '#8FAE58',
  orange: '#D18A52',
  rose: '#D06B84',
  magenta: '#B06BC9',
  /** Neutral — "Uncategorised" and "Other". Deliberately the dullest, so an
   *  unsorted transaction never competes with a sorted one. */
  slate: '#7A8599',
} as const;

export const categoryPalette = Object.values(category);

/**
 * Deterministic category → colour. The same id always yields the same hue,
 * across devices and reinstalls, without needing a colour stored per category.
 *
 * FNV-1a rather than a naive `charCodeAt` sum, because summed char codes
 * collide constantly on the anagram-ish names real categories have
 * ("Transport"/"Transports"), which would hand two adjacent bars the same hue.
 */
export function getCategoryColor(id: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const index = Math.abs(hash) % categoryPalette.length;
  return categoryPalette[index] ?? category.slate;
}

export const colors = {
  surface,
  action,
  money,
  text,
  rule,
  state,
  category,
  /** Scrims behind modals and sheets. */
  scrim: 'rgba(3, 5, 9, 0.72)',
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────
// 4pt base. `gutter` is the screen edge inset and is called out separately
// because it is a layout decision, not a spacing step.

export const spacing = {
  /** 2px — optical nudges only. */
  hair: 2,
  /** 4px */ xs: 4,
  /** 8px */ sm: 8,
  /** 12px */ md: 12,
  /** 16px */ lg: 16,
  /** 24px */ xl: 24,
  /** 32px */ xxl: 32,
  /** 48px */ xxxl: 48,
  /** 64px */ huge: 64,
  /** Screen edge inset. */
  gutter: 20,
} as const;

// ── Radius ────────────────────────────────────────────────────────────────
// Tightened from the previous 8/12/16/24. Large soft radii read friendly and
// generic; a tighter, more restrained set reads precise. Ruled ledger sections
// stay square — radius is for things that genuinely float.

export const radius = {
  none: 0,
  /** 6px — inputs, small chips. */
  sm: 6,
  /** 10px — buttons, cards. */
  md: 10,
  /** 14px — sheets, large surfaces. */
  lg: 14,
  /** Fully round. */
  pill: 9999,
} as const;

// ── Shadow ────────────────────────────────────────────────────────────────
// Used sparingly and only where a surface genuinely floats above content.
// The hairline edge (colors.rule.edge) does most of the elevation work.

export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  /** Bottom sheets and modals. */
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  /** Popovers, menus, toasts. */
  popover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

// ── Motion ────────────────────────────────────────────────────────────────
// One physics model, three tunings. Nothing in this app uses a linear or
// default ease — everything either springs or uses the curves below.
//
// Damping ratio ζ = damping / (2·√(stiffness · mass)). ζ < 1 overshoots,
// ζ = 1 is critically damped, ζ > 1 glides in without overshoot.

export const motion = {
  spring: {
    /** ζ ≈ 0.73 — a few percent overshoot. Buttons, toggles, chips: things
     *  that should feel like they snap back against your finger. */
    snap: { damping: 26, stiffness: 320, mass: 1 },
    /** ζ ≈ 0.89 — essentially no overshoot. The default for almost everything:
     *  sheets, list items, screen elements. */
    settle: { damping: 24, stiffness: 180, mass: 1 },
    /** ζ ≈ 1.51 — overdamped, slow and weighty. Large surfaces and the balance
     *  hero, where overshoot would read as flimsy rather than lively. */
    drift: { damping: 30, stiffness: 90, mass: 1.1 },
  },
  duration: {
    /** Colour and opacity changes that should feel instantaneous. */
    instant: 90,
    quick: 160,
    base: 260,
    slow: 420,
  },
  /** Cubic-bezier control points, for the rare case where a spring is wrong
   *  (looping ambient animation, or anything that must land on an exact beat). */
  easing: {
    /** Decelerate — entering content. */
    out: [0.16, 1, 0.3, 1] as const,
    /** Accelerate — exiting content. */
    in: [0.7, 0, 0.84, 0] as const,
    /** Symmetric — moves between two on-screen positions. */
    inOut: [0.65, 0, 0.35, 1] as const,
  },
} as const;

// ── Material ──────────────────────────────────────────────────────────────
// Parameters for the Skia layer. Kept as tokens so the whole app's sense of
// texture and atmosphere can be tuned from one place.

export const material = {
  grain: {
    /** Film grain opacity. Below ~0.02 it is invisible; above ~0.05 it reads as
     *  noise rather than texture. */
    opacity: 0.035,
    /** Fractal-noise frequency. Higher is finer. */
    frequency: 0.8,
    octaves: 3,
  },
  atmosphere: {
    /** Peak opacity of the radial light-source wash behind hero areas. */
    opacity: 0.5,
    /** Fraction of the shorter viewport axis. */
    radius: 1.1,
  },
  bloom: {
    /** Blur radius behind emitting elements (the hero amount). */
    blur: 28,
    opacity: 0.4,
  },
} as const;

// ── Non-visual constants ──────────────────────────────────────────────────
// Not design tokens; kept here because existing modules already import them
// from this file.

export const security = {
  /** 5 minutes in milliseconds */
  BIOMETRIC_LOCK_TIMEOUT_MS: 5 * 60 * 1000,
  /** Minor units (kobo). See AmountDisplay for the currency-coupling note. */
  BIOMETRIC_CONFIRMATION_KOBO: 5_000_000n,
} as const;

export const performance = {
  /** FlashList pre-render distance in pixels */
  FLASHLIST_DRAW_DISTANCE: 500,
  /** Ledger row measured height */
  TRANSACTION_CARD_HEIGHT: 72,
} as const;
