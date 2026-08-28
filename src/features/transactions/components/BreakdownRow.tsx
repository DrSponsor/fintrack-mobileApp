/**
 * BreakdownRow — one category's share of the month.
 *
 * Same idea as FlowBar: the row's own hairline carries the proportion, so the
 * breakdown is a list of ledger rows that happen to be measurable rather than
 * a chart parked underneath one. Nothing on screen is chart furniture.
 *
 * ── Why the colour is identity, not judgement ────────────────────────────
 * The segment takes a colour from the category palette, which is deliberately
 * kept clear of jade and clay. Money colours mean DIRECTION here, and a
 * groceries bar rendered in clay would read as "this went badly" rather than
 * "this is groceries". Spending more on food than transport is not a fault.
 *
 * ── Why the percentage and the amount are both shown ─────────────────────
 * The share answers "what dominated"; the amount answers "how much". A
 * breakdown with only percentages is unactionable — 40% of an unknown total is
 * not a number anyone can do anything with.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/design-system/motion/springs';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { formatKoboToNaira } from '@/shared/components/AmountDisplay/AmountDisplay';

export interface BreakdownRowProps {
  readonly name: string;
  readonly spentKobo: bigint;
  /** 0–1 of the month's spending. */
  readonly share: number;
  /** Colour from the category identity palette. */
  readonly tint: string;
  /** Staggers the draw so the rows read top to bottom instead of as one
   *  block. Largest category first, which is also the reading order. */
  readonly order?: number;
}

const FLOOR = 0.015;

export function BreakdownRow({ name, spentKobo, share, tint, order = 0 }: BreakdownRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const grow = useSharedValue(0);

  const width = Math.min(1, Math.max(FLOOR, share));
  // Rounded for display only. A category at 0.4% reads "<1%" rather than "0%",
  // which would claim it spent nothing.
  const percent = share > 0 && share < 0.01 ? '<1%' : `${Math.round(share * 100)}%`;

  // The rule is measured out rather than simply present. A bar that appears
  // states a value; a bar that grows states a comparison, which is the whole
  // job of a breakdown. Staggered by position so the rows read top to bottom
  // — largest first, which is already the sort order — instead of landing as
  // one block.
  useEffect(() => {
    if (reducedMotion) {
      grow.value = 1;
      return;
    }
    grow.value = 0;
    grow.value = withDelay(
      order * 70,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
    );
  }, [grow, reducedMotion, share, order]);

  // Animating flex rather than width, because the rule's track is a flex row
  // and a percentage width inside it would resolve against an indefinite
  // measure — the same trap the tab bar fell into.
  const fillStyle = useAnimatedStyle(() => ({ flex: Math.max(0.0001, grow.value * width) }));
  const restStyle = useAnimatedStyle(() => ({ flex: Math.max(0.0001, 1 - grow.value * width) }));

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${name}, ${percent} of spending, ${formatKoboToNaira(spentKobo)}`}
    >
      <View style={styles.line}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.percent}>{percent}</Text>
        <Text style={styles.amount} numberOfLines={1}>
          {formatKoboToNaira(spentKobo)}
        </Text>
      </View>

      {/* The rule that would have sat here anyway, carrying the proportion. */}
      <View style={styles.rule}>
        <Animated.View style={[styles.fill, { backgroundColor: tint }, fillStyle]} />
        <Animated.View style={restStyle} />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      paddingTop: theme.spacing.lg,
    },
    line: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    name: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
      flex: 1,
    },
    percent: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
      // Fixed width so the percentages form their own column and the amounts
      // that follow stay aligned regardless of "7%" versus "42%".
      width: 34,
      textAlign: 'right',
    },
    amount: {
      ...theme.typography.amountRow,
      color: theme.colors.text.secondary,
    },
    rule: {
      flexDirection: 'row',
      height: 2,
      backgroundColor: theme.colors.rule.faint,
    },
    fill: {
      height: 2,
    },
  });
}
