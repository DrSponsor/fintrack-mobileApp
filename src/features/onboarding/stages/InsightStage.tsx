/**
 * Stage 3 — Foresight.
 *
 * ── Why this replaced the gauge ──────────────────────────────────────────
 * The previous version was a 250° arc reading ₦284,500 of ₦400,000. It was
 * well drawn and it argued for nothing, because a gauge is a snapshot of the
 * present: it has no time axis, nothing approaching, and no warning. The slide
 * it illustrates promises the opposite — "you will see it coming, well before
 * it lands", budgets that warn you early "rather than after the fact". A dial
 * showing where you stand right now IS the after-the-fact reporting the copy
 * promises to replace, so the picture quietly contradicted the words.
 *
 * A circular budget gauge is also the single most reproduced visual in personal
 * finance. Being the same as everyone else while also being off-message is not
 * a trade worth keeping.
 *
 * ── What a projection says that a gauge cannot ───────────────────────────
 * This draws cumulative spend against the day of the month, continues it past
 * today as a dashed trajectory at the current burn rate, and marks the point
 * where that trajectory crosses the budget ceiling — the 25th, six days before
 * month end. That is literally "you will see it coming": there is a time axis,
 * a forecast, and a specific future date on which something goes wrong.
 *
 * ── Details that decide whether it reads as real ─────────────────────────
 *
 *   THE ACTUAL LINE IS IRREGULAR. Cumulative spending is lumpy — heavier at
 *   weekends, flat on quiet days. A straight ramp would be instantly legible
 *   as invented. The daily figures are uneven and sum exactly to ₦284,500.
 *
 *   EVERY FIGURE IS DERIVED, NOT WRITTEN. The burn rate, the projected total,
 *   the overage and the crossing date are all computed from the same array the
 *   line is drawn from. Nothing can drift out of agreement with the chart, and
 *   the projection is arithmetic anyone could check.
 *
 *   THE PROJECTION IS NOT ROUND. ₦489,972, not ₦490,000. A round number reads
 *   as a guess; this is what the arithmetic actually produces.
 *
 *   SOLID FOR THE PAST, DASHED FOR THE FUTURE. The oldest convention in
 *   charting, and it does the whole job of separating record from estimate
 *   without a legend.
 *
 * Clay throughout, because every line here is money already spent or money
 * forecast to be spent. The crossing marker is the one exception in weight
 * rather than hue: it is drawn brighter because it is the conclusion.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  Canvas,
  Circle,
  DashPathEffect,
  LinearGradient,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useReducedMotion } from '@/design-system/motion/springs';
import { RollingNumber } from '@/design-system/motion/RollingNumber';
import { formatKoboToNaira } from '@/shared/components/AmountDisplay/AmountDisplay';
import { easeOut, phase } from '../timeline';

/** One pass, not a loop. A chart that redraws itself every few seconds while
 *  you are still reading it is an irritation, not an animation. */
const DRAW_MS = 2800;

/**
 * The chart FLEXES into whatever height the stage is given, and reads its own
 * measured height back for the geometry. It does not take a fixed height, and
 * it does not compute one from the viewport.
 *
 * The viewport-ratio version of this was wrong, and instructively so. Available
 * height is not proportional to screen height — the text block, the footer and
 * the top bar are all fixed, so the leftover grows FASTER than the screen. Any
 * single ratio therefore overflows at one end or floats at the other: 0.19
 * fitted an 800dp phone and clipped the verdict row off a 568dp one.
 *
 * Flexing removes the guess. The chart asks for what is left, the clamps keep
 * it sane, and the parent's `justifyContent: center` distributes anything the
 * cap leaves over.
 *
 * The clamps: below ~88 the plot is too shallow to read a trajectory off;
 * above ~176 the chart starts competing with the headline for the role of the
 * thing you look at first.
 */
const CHART_MIN = 88;
const CHART_MAX = 176;
const PAD_TOP = 10;
const PAD_BOTTOM = 8;

const DAYS = 31;
const TODAY = 18;
const BUDGET_KOBO = 40_000_000n; // ₦400,000.00

/**
 * Cumulative spend in kobo, day 1 → 18. Uneven on purpose: weekends run heavy,
 * midweek runs light, and one day is nearly flat. Daily amounts sum to exactly
 * ₦284,500 so the last point, the burn rate and the projection all agree.
 */
const ACTUAL_KOBO: readonly bigint[] = [
  1_200_000n, 2_050_000n, 4_250_000n, 6_050_000n, 6_650_000n, 8_100_000n,
  9_000_000n, 10_150_000n, 12_750_000n, 14_250_000n, 15_000_000n, 16_900_000n,
  18_100_000n, 19_150_000n, 21_550_000n, 23_650_000n, 26_150_000n, 28_450_000n,
];

const SPENT_KOBO = ACTUAL_KOBO[ACTUAL_KOBO.length - 1] ?? 0n;
/** Integer division — the rate stays in whole kobo, so no float ever touches
 *  a money value. See formatKoboToNaira for the same guarantee. */
const RATE_KOBO_PER_DAY = SPENT_KOBO / BigInt(TODAY);
const PROJECTED_KOBO = SPENT_KOBO + RATE_KOBO_PER_DAY * BigInt(DAYS - TODAY);
const OVER_KOBO = PROJECTED_KOBO - BUDGET_KOBO;

/** The day the trajectory crosses the ceiling. Float is fine here — it is a
 *  position on an axis and a label, never an amount. */
const CROSS_DAY =
  TODAY + Number(BUDGET_KOBO - SPENT_KOBO) / Number(RATE_KOBO_PER_DAY);

/** Headroom above the projection so the trajectory is not clipped. */
const Y_MAX_KOBO = 52_000_000n; // ₦520,000

/** Drops the kobo. Nobody reads a forecast to the kobo, and the two decimals
 *  cost four monospace character widths the layout does not have. */
function formatWhole(kobo: bigint): string {
  return formatKoboToNaira(kobo).replace(/\.\d{2}$/, '');
}

interface StageProps {
  readonly isActive: boolean;
}

export function InsightStage({ isActive }: StageProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  // Paths are built in pixels, so the chart has to measure itself first — on
  // BOTH axes now, since the height is whatever flex ends up granting it.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height: chartH } = size;
  const clock = useSharedValue(0);

  // Flips once from a timer so the projected figure rolls after the trajectory
  // has been drawn. Reset during render rather than in the effect: setState
  // called synchronously in an effect body causes a second render pass, which
  // here would land mid-draw.
  const [revealed, setRevealed] = useState(false);
  const [wasActive, setWasActive] = useState(isActive);
  if (wasActive !== isActive) {
    setWasActive(isActive);
    if (!isActive && revealed) setRevealed(false);
  }

  useEffect(() => {
    if (!isActive) {
      cancelAnimation(clock);
      clock.value = 0;
      return;
    }
    if (reducedMotion) {
      // Park on the finished frame. `revealed` is deliberately NOT set here —
      // `projected` below already treats reducedMotion as revealed, so setting
      // it would be a redundant setState inside an effect body and a cascading
      // render for nothing.
      clock.value = 1;
      return;
    }
    clock.value = 0;
    clock.value = withTiming(1, { duration: DRAW_MS, easing: Easing.linear });
    const timer = setTimeout(() => setRevealed(true), DRAW_MS * 0.7);
    return () => {
      clearTimeout(timer);
      cancelAnimation(clock);
    };
  }, [isActive, reducedMotion, clock]);

  const onLayout = (event: LayoutChangeEvent): void => {
    const { width: w, height: h } = event.nativeEvent.layout;
    // Guarded so a layout pass reporting identical numbers cannot loop.
    setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
  };

  const plotH = chartH - PAD_TOP - PAD_BOTTOM;
  const baseline = chartH - PAD_BOTTOM;
  const yFor = (kobo: bigint): number =>
    PAD_TOP + (1 - Number(kobo) / Number(Y_MAX_KOBO)) * plotH;
  const xFor = (day: number): number => ((day - 1) / (DAYS - 1)) * width;

  const yBudget = yFor(BUDGET_KOBO);
  const xToday = xFor(TODAY);
  const xCross = xFor(CROSS_DAY);

  // ── Paths ───────────────────────────────────────────────────────────────

  const actualPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0 || chartH <= 0) return path;
    ACTUAL_KOBO.forEach((value, index) => {
      const x = xFor(index + 1);
      const y = yFor(value);
      if (index === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, chartH]);

  /** The same line closed down to the baseline, for the wash underneath. */
  const areaPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0 || chartH <= 0) return path;
    path.moveTo(xFor(1), baseline);
    ACTUAL_KOBO.forEach((value, index) => {
      path.lineTo(xFor(index + 1), yFor(value));
    });
    path.lineTo(xFor(TODAY), baseline);
    path.close();
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, chartH]);

  const projectionPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0 || chartH <= 0) return path;
    path.moveTo(xFor(TODAY), yFor(SPENT_KOBO));
    path.lineTo(xFor(DAYS), yFor(PROJECTED_KOBO));
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, chartH]);

  const ceilingPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0 || chartH <= 0) return path;
    path.moveTo(0, yBudget);
    path.lineTo(width, yBudget);
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, chartH]);

  const todayPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0 || chartH <= 0) return path;
    path.moveTo(xToday, PAD_TOP);
    path.lineTo(xToday, baseline);
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, chartH]);

  // ── Timeline ────────────────────────────────────────────────────────────
  // One clock, sliced. The ceiling and today marker establish the frame, the
  // record draws, the forecast extends from where it stopped, and only then
  // does the conclusion land.

  const frameOpacity = useDerivedValue(() => easeOut(phase(clock.value, 0, 0.12)));
  const actualEnd = useDerivedValue(() => easeOut(phase(clock.value, 0.1, 0.48)));
  const areaOpacity = useDerivedValue(() => easeOut(phase(clock.value, 0.2, 0.56)));
  const projectionEnd = useDerivedValue(() => easeOut(phase(clock.value, 0.48, 0.72)));
  const markerOpacity = useDerivedValue(() => easeOut(phase(clock.value, 0.68, 0.8)));

  const verdictStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, 0.7, 0.9));
    return { opacity: t, transform: [{ translateY: (1 - t) * 8 }] };
  });

  const headStyle = useAnimatedStyle(() => ({
    opacity: easeOut(phase(clock.value, 0, 0.14)),
  }));

  const projected: bigint = revealed || reducedMotion ? PROJECTED_KOBO : 0n;

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.head, headStyle]}>
        <Text style={styles.headLabel}>AUGUST</Text>
        <Text style={styles.headMeta}>DAY {TODAY} OF {DAYS}</Text>
      </Animated.View>

      <View style={styles.chart} onLayout={onLayout}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Budget ceiling — dashed, because a limit is a rule rather than a
              measurement. */}
          <Path
            path={ceilingPath}
            style="stroke"
            strokeWidth={1}
            color={theme.colors.text.disabled}
            opacity={frameOpacity}
          >
            <DashPathEffect intervals={[3, 4]} />
          </Path>

          {/* Where the present is. Everything left of it is record. */}
          <Path
            path={todayPath}
            style="stroke"
            strokeWidth={1}
            color={theme.colors.rule.default}
            opacity={frameOpacity}
          />

          {/* Wash under the record. */}
          <Path path={areaPath} style="fill" opacity={areaOpacity}>
            <LinearGradient
              start={vec(0, PAD_TOP)}
              end={vec(0, baseline)}
              colors={[theme.colors.money.outboundWash, 'transparent']}
            />
          </Path>

          {/* The record. */}
          <Path
            path={actualPath}
            style="stroke"
            strokeWidth={2}
            strokeJoin="round"
            strokeCap="round"
            color={theme.colors.money.outbound}
            start={0}
            end={actualEnd}
          />

          {/* The forecast, continuing from exactly where the record stops. */}
          <Path
            path={projectionPath}
            style="stroke"
            strokeWidth={1.5}
            strokeCap="round"
            color={theme.colors.money.outbound}
            start={0}
            end={projectionEnd}
            opacity={0.55}
          >
            <DashPathEffect intervals={[5, 5]} />
          </Path>

          {/* The conclusion: where forecast meets ceiling. */}
          <Circle
            cx={xCross}
            cy={yBudget}
            r={4}
            color={theme.colors.action.base}
            opacity={markerOpacity}
          />
        </Canvas>

        {/* Reference-line label, positioned against the line it names — the
            way a chart annotates, rather than exiled to a legend. */}
        <Animated.Text style={[styles.ceilingLabel, { top: yBudget - 15 }, headStyle]}>
          LIMIT {formatWhole(BUDGET_KOBO)}
        </Animated.Text>
      </View>

      <Animated.View style={[styles.axis, headStyle]}>
        <Text style={styles.axisLabel}>1 AUG</Text>
        <Text style={styles.axisLabel}>31 AUG</Text>
      </Animated.View>

      <Animated.View style={verdictStyle}>
        <View style={styles.rule} />
        <View style={styles.verdict}>
          <Text style={styles.verdictLabel}>PROJECTED</Text>
          <RollingNumber
            value={projected}
            format={formatWhole}
            style={styles.verdictAmount}
            accessibilityLabel={`Projected four hundred and eighty nine thousand, nine hundred and seventy two naira by the thirty first`}
          />
        </View>
        <Text style={styles.warning}>
          Over budget from {Math.floor(CROSS_DAY)} Aug — {formatWhole(OVER_KOBO)} above your limit
        </Text>
      </Animated.View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    stage: {
      flex: 1,
      justifyContent: 'center',
    },

    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    headLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.secondary,
      letterSpacing: 1.4,
    },
    headMeta: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
    },

    // Flexes into the leftover height, clamped at both ends. See the note at
    // CHART_MIN.
    chart: {
      flex: 1,
      minHeight: CHART_MIN,
      maxHeight: CHART_MAX,
    },
    ceilingLabel: {
      position: 'absolute',
      right: 0,
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
    },

    axis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.xs,
    },
    axisLabel: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
    },

    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
      marginTop: theme.spacing.md,
    },
    verdict: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: theme.spacing.sm,
    },
    verdictLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.4,
    },
    verdictAmount: {
      ...theme.typography.amountDisplay,
      color: theme.colors.text.primary,
    },
    warning: {
      ...theme.typography.caption,
      color: theme.colors.money.outbound,
      marginTop: theme.spacing.xs,
    },
  });
}
