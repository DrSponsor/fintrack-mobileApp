/**
 * FinTrack Design System — Design Tokens
 *
 * Dark mode first. Premium fintech aesthetic.
 * Every colour, spacing value, radius, typography spec, and shadow
 * used anywhere in the app comes from this file.
 *
 * No hardcoded values in components. Ever.
 */

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────
  bg: {
    primary: '#0F0F11', // Near-black. Deep, premium.
    secondary: '#18181C', // Cards, elevated surfaces
    tertiary: '#222228', // Inputs, subtle differentiation
    overlay: 'rgba(0, 0, 0, 0.6)', // Modal overlays
  },

  // ── Accent colours ──────────────────────────────────────
  accent: {
    green: '#1D9E75', // Income, positive, success, primary brand
    greenLight: '#E1F5EE', // Green tint for light backgrounds
    greenDark: '#16785A', // Pressed state
    amber: '#F59E0B', // Warning, mid-budget
    amberLight: '#FEF3C7',
    red: '#EF4444', // Overspend, negative, error
    redLight: '#FEE2E2',
    blue: '#3B82F6', // Info, links
    blueLight: '#DBEAFE',
    purple: '#8B5CF6', // Special badges, Pro features
  },

  // ── Text ─────────────────────────────────────────────────
  text: {
    primary: '#F5F5F5', // Main body text
    secondary: '#A0A0A8', // Supporting text, timestamps
    tertiary: '#606068', // Disabled, hints
    inverse: '#0F0F11', // Text on light backgrounds
    success: '#1D9E75',
    warning: '#F59E0B',
    danger: '#EF4444',
  },

  // ── Borders ──────────────────────────────────────────────
  border: {
    default: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.15)',
    focus: '#1D9E75',
  },

  // ── Light theme overrides ────────────────────────────────
  light: {
    bg: {
      primary: '#FAFAFA',
      secondary: '#FFFFFF',
      tertiary: '#F3F4F6',
      overlay: 'rgba(0, 0, 0, 0.4)',
    },
    text: {
      primary: '#111111',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },
    border: {
      default: 'rgba(0, 0, 0, 0.08)',
      strong: 'rgba(0, 0, 0, 0.15)',
      focus: '#1D9E75',
    },
  },
} as const;

export const spacing = {
  /** 4px */ xs: 4,
  /** 8px */ sm: 8,
  /** 12px */ md: 12,
  /** 16px */ lg: 16,
  /** 24px */ xl: 24,
  /** 32px */ xxl: 32,
  /** 48px */ xxxl: 48,
} as const;

export const radius = {
  /** 8px */ sm: 8,
  /** 12px */ md: 12,
  /** 16px */ lg: 16,
  /** 24px */ xl: 24,
  /** Full circle */ full: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardSubtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

// ── Animation constants ────────────────────────────────────
export const animation = {
  spring: {
    default: { damping: 20, stiffness: 90 },
    snappy: { damping: 15, stiffness: 150 },
    gentle: { damping: 25, stiffness: 60 },
  },
  timing: {
    fast: 150,
    default: 300,
    slow: 500,
  },
} as const;

// ── Security constants ─────────────────────────────────────
export const security = {
  /** 5 minutes in milliseconds */
  BIOMETRIC_LOCK_TIMEOUT_MS: 5 * 60 * 1000,
  /** ₦50,000 = 5,000,000 kobo */
  BIOMETRIC_CONFIRMATION_KOBO: 5_000_000n,
} as const;

// ── Performance constants ──────────────────────────────────
export const performance = {
  /** FlashList pre-render distance in pixels */
  FLASHLIST_DRAW_DISTANCE: 500,
  /** Transaction card measured height */
  TRANSACTION_CARD_HEIGHT: 72,
} as const;
