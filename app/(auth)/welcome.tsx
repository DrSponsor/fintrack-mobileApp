import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { SETTLE, useReducedMotion } from '@/design-system/motion/springs';

/**
 * Welcome — composed as a statement document, not a landing page.
 *
 * The previous version was the canonical generated layout: centred-ish mark,
 * big headline with the closing clause in an accent colour, paragraph, list
 * with a dot label, full-width coloured button, text link. Every gap an even
 * multiple, nothing crowding, nothing bleeding. Competent and completely
 * anonymous.
 *
 * What changes here:
 *
 *   FULL-BLEED RULES. The rules run edge to edge, past the content margin.
 *   Inset rules read as card dividers; rules that reach the paper's edge read
 *   as a printed document. This single change does most of the work.
 *
 *   A DATELINE. Mastheads on financial documents carry a reference and a
 *   period, set small and wide. It dates the page and implies a record.
 *
 *   AN INDEX COLUMN. Entries are numbered 01/02/03 in monospace. Real ledgers
 *   number their lines; it also gives the eye a fixed left edge to travel down.
 *
 *   DENSITY CONTRAST. The headline block breathes; the ledger block is tight.
 *   Uniform rhythm everywhere is what makes a layout feel unconsidered — the
 *   tension between crowded and open is the composition.
 *
 *   NO ACCENT COLOUR IN THE HEADLINE. Colour is reserved for money, so the
 *   only chroma on this screen is the jade on the one inbound amount.
 */

const CAPTURED = [
  { merchant: 'GTBank', detail: 'Transfer received', amount: '+₦120,000.00', inbound: true },
  { merchant: 'Uber', detail: 'Trip · Lekki Phase 1', amount: '−₦3,200.00', inbound: false },
  { merchant: 'Jumia', detail: 'Order #4471', amount: '−₦45,900.00', inbound: false },
] as const;

const ROW_STAGGER_MS = 110;
const ROW_BASE_DELAY_MS = 420;

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.page}>
      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <View style={styles.rule} />
      <View style={styles.masthead}>
        <Text style={styles.mastheadMark}>FINTRACK</Text>
        <Pressable
          onPress={() => router.push('/(auth)/onboarding')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="See how FinTrack works"
        >
          <Text style={styles.mastheadMeta}>HOW IT WORKS →</Text>
        </Pressable>
      </View>
      <View style={styles.rule} />

      {/* ── Headline: the open half of the page ──────────────────────────── */}
      <View style={styles.hero}>
        <Text style={styles.headline}>
          Know exactly{'\n'}where your{'\n'}money goes.
        </Text>
        <Text style={styles.standfirst}>
          FinTrack reads the alerts your bank already sends and keeps the books itself.
        </Text>
      </View>

      {/* ── Ledger: the tight half ───────────────────────────────────────── */}
      <View style={styles.ledger}>
        <View style={styles.rule} />
        <View style={styles.ledgerHead}>
          <Text style={styles.ledgerHeadLabel}>CAPTURED TODAY</Text>
          <Text style={styles.ledgerHeadCount}>3 ENTRIES</Text>
        </View>
        <View style={styles.ruleStrong} />

        {CAPTURED.map((entry, index) => (
          <LedgerRow key={entry.merchant} entry={entry} index={index} styles={styles} />
        ))}
        <View style={styles.rule} />
      </View>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          onPress={() => router.push('/(auth)/register')}
          accessibilityRole="button"
          accessibilityLabel="Create a free account"
        >
          {/* A button label must never wrap. */}
          <Text style={styles.primaryLabel} numberOfLines={1}>
            Open an account
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => router.push('/(auth)/login')}
          accessibilityRole="button"
          accessibilityLabel="Sign in to an existing account"
        >
          <Text style={styles.secondaryLabel}>I already have one</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Ledger row ────────────────────────────────────────────────────────────

interface LedgerRowProps {
  readonly entry: (typeof CAPTURED)[number];
  readonly index: number;
  readonly styles: ReturnType<typeof createStyles>;
}

function LedgerRow({ entry, index, styles }: LedgerRowProps): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(ROW_BASE_DELAY_MS + index * ROW_STAGGER_MS, withSpring(1, SETTLE));
  }, [index, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }],
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      {/* Line number — a real ledger convention, and a fixed left edge for the
          eye to run down. Tertiary so it never competes with the entry. */}
      <Text style={styles.rowIndex}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowMerchant} numberOfLines={1}>
          {entry.merchant}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {entry.detail}
        </Text>
      </View>
      <Text style={[styles.rowAmount, entry.inbound && styles.rowAmountIn]}>{entry.amount}</Text>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

/** Content margin. Rules deliberately ignore this and run to the screen edge. */
const MARGIN = 22;

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingTop: theme.spacing.xxl,
      paddingBottom: theme.spacing.lg,
    },

    // Full-bleed — no horizontal inset. This is the difference between a
    // document and a stack of cards.
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.default,
    },
    ruleStrong: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
    },

    masthead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.sm,
    },
    mastheadMark: {
      ...theme.typography.micro,
      color: theme.colors.text.primary,
      letterSpacing: 3.2,
    },
    mastheadMeta: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
      letterSpacing: 0.6,
    },

    // The open half.
    hero: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: MARGIN,
    },
    headline: {
      ...theme.typography.display,
      color: theme.colors.text.primary,
    },
    standfirst: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.lg,
      maxWidth: 300,
    },

    // The tight half.
    ledger: {
      marginTop: theme.spacing.md,
    },
    ledgerHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.sm,
    },
    ledgerHeadLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.4,
    },
    ledgerHeadCount: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.faint,
    },
    rowIndex: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
      width: 26,
    },
    rowBody: {
      flex: 1,
    },
    rowMerchant: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
    rowDetail: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: 1,
    },
    rowAmount: {
      ...theme.typography.amountRow,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.md,
    },
    // Only inbound money is coloured. Ordinary spending stays neutral — a week
    // of normal purchases should not render as a screen full of warnings.
    rowAmountIn: {
      color: theme.colors.money.inbound,
    },

    actions: {
      paddingHorizontal: MARGIN,
      paddingTop: theme.spacing.xl,
    },
    // Fixed height rather than vertical padding. Padding lets the control grow
    // if the label ever wraps — which is exactly what happened here, turning a
    // button into a slab. A fixed height makes wrapping visible as a bug
    // instead of silently absorbing it.
    // `justifyContent` centres vertically; horizontal centring is done by
    // `textAlign` on a full-width label, NOT by `alignItems: 'center'`.
    // alignItems centre makes the label size to its own content width, which
    // leaves it free to be squeezed — first it wrapped to two lines, then
    // (once wrapping was disabled) it truncated to "Open a…". A stretched
    // label cannot be squeezed by its container.
    primary: {
      height: 52,
      backgroundColor: theme.colors.action.base,
      borderRadius: theme.radius.sm,
      justifyContent: 'center',
    },
    primaryPressed: {
      backgroundColor: theme.colors.action.deep,
      transform: [{ scale: 0.99 }],
    },
    primaryLabel: {
      ...theme.typography.button,
      color: theme.colors.action.on,
      textAlign: "center",
    },
    secondary: {
      paddingVertical: theme.spacing.md,
    },
    secondaryLabel: {
      ...theme.typography.button,
      color: theme.colors.text.tertiary,
      textAlign: "center",
    },
  });
}
