/**
 * Stage 2 — Categorise.
 *
 * A category breakdown built as a *data table*, not a bar chart.
 *
 * The first version was four rounded progress bars with a label and an amount.
 * That shape says "something is loading", not "here is your money analysed":
 * there was no axis, no share, no total, no way to reach a conclusion from it.
 * A bar you cannot read a number off is decoration.
 *
 * What makes this read as an instrument:
 *
 *   COLUMN HEADERS AND A RULED STRUCTURE. Financial reporting is tabular. The
 *   header row and the rule beneath it are what turn a list into a table.
 *
 *   DATA BARS BEHIND THE ROW, not beside it. The proportional fill runs under
 *   the row content the way a spreadsheet data bar does, so the bar and the
 *   figure it describes occupy the same line rather than competing for space.
 *
 *   AN EXPLICIT SHARE COLUMN. A percentage of total is the number a person
 *   actually reasons with — "food is nearly half my spending" is the insight;
 *   ₦84,200 on its own is trivia.
 *
 *   A TOTAL ROW WITH A PERIOD COMPARISON. Totals close a table, and the
 *   month-on-month delta is what turns a report into a judgement.
 *
 * Category colour is the documented exception to "colour means money": inside a
 * breakdown it carries identity, not value. It stays confined to the data bars
 * and never touches an amount, which keeps money semantics unambiguous.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useReducedMotion } from '@/design-system/motion/springs';
import { easeIn, easeOut, phase } from '../timeline';

const LOOP_MS = 5200;

/**
 * Six categories rather than four, because four rows reads as a mock-up. Real
 * spending has a long tail, and a breakdown that shows the tail — including
 * the small, dull rows — is what makes it look like a report rather than an
 * illustration of one.
 *
 * Shares are exact against the total and sum to precisely 100. A breakdown that
 * adds up to 99 destroys the credibility of every other number near it.
 */
const BREAKDOWN = [
  { label: 'Food & drink', amount: '82,400', share: 41, tone: 'orange' },
  { label: 'Shopping', amount: '43,900', share: 22, tone: 'violet' },
  { label: 'Transport', amount: '30,200', share: 15, tone: 'blue' },
  { label: 'Bills & utilities', amount: '22,000', share: 11, tone: 'cyan' },
  { label: 'Airtime & data', amount: '11,800', share: 6, tone: 'lime' },
  { label: 'Health', amount: '9,300', share: 5, tone: 'rose' },
] as const;

const TOTAL = '199,600';
const PEAK_SHARE = 41;

interface StageProps {
  readonly isActive: boolean;
}

export function SortStage({ isActive }: StageProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const clock = useSharedValue(0);
  // Data bars are sized in pixels, so the row has to be measured first —
  // percentage widths cannot be interpolated on the UI thread.
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    if (!isActive || reducedMotion) {
      cancelAnimation(clock);
      clock.value = 0.8;
      return;
    }
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, { duration: LOOP_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(clock);
  }, [isActive, reducedMotion, clock]);

  const onLayout = (event: LayoutChangeEvent): void => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  const totalStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, 0.5, 0.66));
    const exit = easeIn(phase(clock.value, 0.92, 1));
    return { opacity: t * (1 - exit) };
  });

  const headStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, 0, 0.1));
    const exit = easeIn(phase(clock.value, 0.92, 1));
    return { opacity: t * (1 - exit) };
  });

  return (
    <View style={styles.stage} onLayout={onLayout}>
      {/* Column headers — what turns a list into a table. */}
      <Animated.View style={headStyle}>
        <View style={styles.rule} />
        <View style={styles.headRow}>
          <Text style={styles.headLabel}>CATEGORY</Text>
          <Text style={[styles.headLabel, styles.colShare]}>SHARE</Text>
          <Text style={[styles.headLabel, styles.colAmount]}>AUGUST</Text>
        </View>
        <View style={styles.ruleStrong} />
      </Animated.View>

      {BREAKDOWN.map((entry, index) => (
        <Row
          key={entry.label}
          entry={entry}
          index={index}
          clock={clock}
          rowWidth={rowWidth}
          styles={styles}
          theme={theme}
        />
      ))}

      {/* Totals close the table; the delta turns a report into a judgement. */}
      <Animated.View style={totalStyle}>
        <View style={styles.ruleStrong} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalDelta}>↑ 8.2% vs July</Text>
          <Text style={styles.totalAmount}>₦{TOTAL}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

interface RowProps {
  readonly entry: (typeof BREAKDOWN)[number];
  readonly index: number;
  readonly clock: SharedValue<number>;
  readonly rowWidth: number;
  readonly styles: ReturnType<typeof createStyles>;
  readonly theme: AppTheme;
}

function Row({ entry, index, clock, rowWidth, styles, theme }: RowProps): React.JSX.Element {
  const start = 0.06 + index * 0.055;
  const colour = theme.colors.category[entry.tone];
  // Bars are scaled against the largest category, not against the total, so the
  // smallest row is still legible instead of collapsing to a stub.
  const target = rowWidth * (entry.share / PEAK_SHARE);

  const barStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, start, start + 0.26));
    const exit = easeIn(phase(clock.value, 0.92, 1));
    return { width: target * t, opacity: 1 - exit };
  });

  const textStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, start + 0.02, start + 0.18));
    const exit = easeIn(phase(clock.value, 0.92, 1));
    return { opacity: t * (1 - exit) };
  });

  return (
    <View style={styles.row}>
      {/* The data bar sits behind the row, spreadsheet-style, so the bar and
          the figures it describes share one line. */}
      <Animated.View
        style={[styles.bar, { backgroundColor: colour }, barStyle]}
        pointerEvents="none"
      />
      <Animated.View style={[styles.rowContent, textStyle]}>
        <View style={[styles.tick, { backgroundColor: colour }]} />
        <Text style={styles.rowLabel} numberOfLines={1}>
          {entry.label}
        </Text>
        <Text style={[styles.rowShare, styles.colShare]}>{entry.share}%</Text>
        <Text style={[styles.rowAmount, styles.colAmount]}>₦{entry.amount}</Text>
      </Animated.View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    stage: {
      justifyContent: 'center',
    },

    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.faint,
    },
    ruleStrong: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
    },

    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    headLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.disabled,
      letterSpacing: 1.1,
      flex: 1,
    },

    // Fixed column widths, right-aligned — the alignment is the whole reason
    // the numbers are monospaced.
    colShare: {
      flex: 0,
      width: 44,
      textAlign: 'right',
    },
    colAmount: {
      flex: 0,
      width: 82,
      textAlign: 'right',
    },

    row: {
      // Tightened from 34 to fit six rows in the same stage box. Denser rows
      // also read as more analytical — reporting tools are not roomy.
      height: 30,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.faint,
    },
    bar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      // Low enough to sit under text without hurting legibility, high enough
      // that the proportion is readable at a glance.
      opacity: 0.16,
    },
    rowContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tick: {
      width: 2,
      height: 12,
      marginRight: theme.spacing.sm,
    },
    rowLabel: {
      ...theme.typography.caption,
      color: theme.colors.text.primary,
      flex: 1,
    },
    rowShare: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.secondary,
    },
    rowAmount: {
      ...theme.typography.technical,
      color: theme.colors.text.primary,
    },

    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: theme.spacing.sm,
    },
    totalLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.1,
    },
    totalDelta: {
      ...theme.typography.technicalSmall,
      color: theme.colors.money.outbound,
      flex: 1,
      textAlign: 'right',
      marginRight: theme.spacing.md,
    },
    totalAmount: {
      ...theme.typography.amountRow,
      color: theme.colors.text.primary,
      width: 82,
      textAlign: 'right',
    },
  });
}
