/**
 * FlowBar — what came in against what went out, as one rule.
 *
 * ── The chart IS the hairline ────────────────────────────────────────────
 * The obvious version of this is two bars, or a donut, or a pair of stat
 * cards. All three are chart furniture dropped onto a screen that already has
 * a strong structure, and they read as borrowed.
 *
 * This app already draws hairlines under everything — fields, ledger rows,
 * section heads. So the proportion is drawn INTO that rule: the same line that
 * would have sat under this block anyway, coloured jade for its inbound share
 * and clay for its outbound one. Nothing is added to the screen; an element
 * already there is made to carry information.
 *
 * It is 3px rather than a true hairline, which is the one concession — a
 * sub-pixel rule cannot hold two distinguishable colours.
 *
 * ── Both figures are always readable ─────────────────────────────────────
 * The bar is the glance; the numbers above it are the answer. A month with
 * almost no income still prints its income in full, because a bar segment too
 * small to see is not a reason to hide the figure it stands for.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { formatKoboToNaira } from '@/shared/components/AmountDisplay/AmountDisplay';

export interface FlowBarProps {
  readonly inKobo: bigint;
  readonly outKobo: bigint;
}

/** Smallest share that still gets a visible segment, so a real but tiny
 *  figure is never drawn as nothing at all. */
const FLOOR = 0.02;

export function FlowBar({ inKobo, outKobo }: FlowBarProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const total = inKobo + outKobo;
  const rawShare = total === 0n ? 0.5 : Number((inKobo * 10_000n) / total) / 10_000;

  // Clamped so neither end disappears entirely while it still has a value.
  const inShare =
    total === 0n ? 0.5 : Math.min(1 - FLOOR, Math.max(FLOOR, rawShare));

  return (
    <View style={styles.block}>
      <View style={styles.figures}>
        <View style={styles.column}>
          <Text style={styles.label}>In</Text>
          <Text style={[styles.amount, styles.amountIn]} numberOfLines={1} adjustsFontSizeToFit>
            {inKobo === 0n ? '—' : `+${formatKoboToNaira(inKobo)}`}
          </Text>
        </View>
        <View style={[styles.column, styles.columnRight]}>
          <Text style={styles.label}>Out</Text>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {outKobo === 0n ? '—' : `−${formatKoboToNaira(outKobo)}`}
          </Text>
        </View>
      </View>

      <View
        style={styles.bar}
        accessibilityRole="image"
        accessibilityLabel={
          total === 0n
            ? 'Nothing moved this month'
            : `${formatKoboToNaira(inKobo)} in, ${formatKoboToNaira(outKobo)} out`
        }
      >
        <View style={[styles.segment, styles.segmentIn, { flex: inShare }]} />
        <View style={[styles.segment, styles.segmentOut, { flex: 1 - inShare }]} />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    block: {
      paddingTop: theme.spacing.lg,
    },
    figures: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.lg,
    },
    column: {
      flex: 1,
    },
    columnRight: {
      alignItems: 'flex-end',
    },
    label: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing.xs,
    },
    // Outbound stays neutral. A month of spending set in clay reads as a month
    // of errors — the same reason LedgerRow leaves its amounts monochrome.
    amount: {
      ...theme.typography.amountDisplay,
      fontSize: 22,
      lineHeight: 27,
      letterSpacing: -0.66,
      color: theme.colors.text.primary,
    },
    amountIn: {
      color: theme.colors.money.inbound,
    },
    bar: {
      flexDirection: 'row',
      height: 3,
      overflow: 'hidden',
    },
    segment: {
      height: 3,
    },
    segmentIn: {
      backgroundColor: theme.colors.money.inbound,
    },
    segmentOut: {
      backgroundColor: theme.colors.money.outbound,
    },
  });
}
