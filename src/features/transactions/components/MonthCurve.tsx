/**
 * MonthCurve — spending accumulating through the month, and where it lands.
 *
 * ── Why this and not another bar ─────────────────────────────────────────
 * The rest of the dashboard answers "how much" and "where". Neither answers
 * the question people actually open a finance app with, which is "am I going
 * to be alright". Totals cannot: ₦465,000 spent means nothing without knowing
 * whether it is the 4th or the 27th.
 *
 * A cumulative line answers it in one glance, because the SLOPE is the rate
 * and the rate is the thing that predicts the rest of the month. It is also
 * the promise onboarding already makes — "sorted before you look" — delivered
 * against real data instead of a demo.
 *
 * ── The projection is deliberately the dumbest honest one ────────────────
 * Spending so far, divided by days elapsed, extended to the month end. No
 * weekday weighting, no excluding one-offs, no last-month shape. Those would
 * all be more accurate on average and none of them can be reconstructed in the
 * head of the person whose money it is. A forecast nobody can check is a
 * forecast nobody should be asked to trust, so this one is arithmetic anyone
 * can redo — and it is drawn dashed, because a projection is a claim about the
 * future and should never share a line style with the record.
 *
 * ── The record is solid, the future is dashed, the present is a rule ─────
 * Same vocabulary as everywhere else: solid lines are things that happened,
 * dashed lines are things that have not, and the hairline marks where now is.
 *
 * ── Drawing it is the point ──────────────────────────────────────────────
 * The line draws itself left to right, then the forecast continues from
 * exactly where the record stopped. That is the same gesture as the focus rule
 * on a field — a line with direction and duration, which the eye follows —
 * rather than a chart that simply exists. Under reduce-motion it is complete
 * from the first frame.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  DashPathEffect,
  LinearGradient,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useReducedMotion } from '@/design-system/motion/springs';
import { formatKoboToNaira } from '@/shared/components/AmountDisplay/AmountDisplay';
import type { SpendCurve } from '../summary';

const HEIGHT = 132;
const PAD_TOP = 10;
const PAD_BOTTOM = 4;
/** Horizontal inset. Without it the record begins on the left edge and the
 *  forecast leaves through the top-right corner, both of which read as the
 *  chart being clipped rather than as the data reaching its bounds. */
const PAD_X = 2;
const DRAW_MS = 1100;

/** 0 before `from`, 1 after `to`, linear between. */
function phase(t: number, from: number, to: number): number {
  'worklet';
  if (t <= from) return 0;
  if (t >= to) return 1;
  return (t - from) / (to - from);
}

function easeOut(t: number): number {
  'worklet';
  return 1 - Math.pow(1 - t, 3);
}

export interface MonthCurveProps {
  readonly curve: SpendCurve;
  /** Hidden along with the balance — a projection is a figure too. */
  readonly redacted: boolean;
}

export function MonthCurve({ curve, redacted }: MonthCurveProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const clock = useSharedValue(0);

  // Re-runs when the month's shape changes, so a new entry redraws the line
  // rather than snapping it.
  const signature = `${curve.today}:${curve.spentKobo}`;

  useEffect(() => {
    if (reducedMotion) {
      clock.value = 1;
      return;
    }
    clock.value = 0;
    clock.value = withTiming(1, { duration: DRAW_MS, easing: Easing.linear });
    return () => {
      cancelAnimation(clock);
    };
  }, [clock, reducedMotion, signature]);

  const chartH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + chartH;

  // The ceiling is the projection plus 8% headroom, so the record and the
  // forecast share one scale and the forecast lands just below the top edge
  // rather than on it — a line that terminates exactly on the frame reads as
  // clipped. Scaling to the record alone would make every month look the same
  // shape regardless of how the month is actually going, which is the one
  // thing this chart exists to show.
  const peak = curve.projectedKobo > 0n ? (curve.projectedKobo * 108n) / 100n : 1n;

  const xFor = useCallback(
    (day: number) =>
      PAD_X + ((day - 1) / Math.max(1, curve.daysInMonth - 1)) * Math.max(0, width - PAD_X * 2),
    [width, curve.daysInMonth],
  );

  const yFor = useCallback(
    (value: bigint) => {
      // Ratio as a bigint fraction first — only the small result becomes a
      // Number, never the kobo.
      const ratio = Number((value * 10_000n) / peak) / 10_000;
      return baseline - ratio * chartH;
    },
    [peak, baseline, chartH],
  );

  const recordPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0 || curve.cumulative.length === 0) return path;
    curve.cumulative.forEach((value, index) => {
      const x = xFor(index + 1);
      const y = yFor(value);
      if (index === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    return path;
  }, [width, curve.cumulative, xFor, yFor]);

  const areaPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0 || curve.cumulative.length === 0) return path;
    path.moveTo(xFor(1), baseline);
    curve.cumulative.forEach((value, index) => {
      path.lineTo(xFor(index + 1), yFor(value));
    });
    path.lineTo(xFor(curve.today), baseline);
    path.close();
    return path;
  }, [width, curve.cumulative, curve.today, xFor, yFor, baseline]);

  const forecastPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0 || curve.cumulative.length === 0) return path;
    path.moveTo(xFor(curve.today), yFor(curve.spentKobo));
    path.lineTo(xFor(curve.daysInMonth), yFor(curve.projectedKobo));
    return path;
  }, [width, curve, xFor, yFor]);

  const nowPath = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0) return path;
    const x = xFor(curve.today);
    path.moveTo(x, PAD_TOP);
    path.lineTo(x, baseline);
    return path;
  }, [width, curve.today, xFor, baseline]);

  // One clock, sliced: the present establishes itself, the record draws, the
  // wash fills in behind it, and only then does the forecast extend.
  const frame = useDerivedValue(() => easeOut(phase(clock.value, 0, 0.14)));
  const recordEnd = useDerivedValue(() => easeOut(phase(clock.value, 0.08, 0.62)));
  const wash = useDerivedValue(() => easeOut(phase(clock.value, 0.24, 0.7)) * 0.9);
  const forecastEnd = useDerivedValue(() => easeOut(phase(clock.value, 0.62, 0.92)));

  return (
    <View style={styles.block}>
      <View style={styles.chart} onLayout={onLayout}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Where now is. Everything left of it is record. */}
          <Path
            path={nowPath}
            style="stroke"
            strokeWidth={1}
            color={theme.colors.rule.default}
            opacity={frame}
          />

          <Path path={areaPath} style="fill" opacity={wash}>
            <LinearGradient
              start={vec(0, PAD_TOP)}
              end={vec(0, baseline)}
              colors={[theme.colors.money.outboundWash, 'transparent']}
            />
          </Path>

          <Path
            path={recordPath}
            style="stroke"
            strokeWidth={2}
            strokeJoin="round"
            strokeCap="round"
            color={theme.colors.money.outbound}
            start={0}
            end={recordEnd}
          />

          {/* The forecast, continuing from exactly where the record stops. */}
          <Path
            path={forecastPath}
            style="stroke"
            strokeWidth={1.5}
            strokeCap="round"
            color={theme.colors.text.tertiary}
            start={0}
            end={forecastEnd}
          >
            <DashPathEffect intervals={[4, 5]} />
          </Path>
        </Canvas>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendLabel}>At this rate, by month end</Text>
        {redacted ? (
          <View style={styles.struck} accessibilityLabel="Projection hidden" />
        ) : (
          <Text style={styles.legendValue}>{formatKoboToNaira(curve.projectedKobo)}</Text>
        )}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    block: {
      paddingTop: theme.spacing.lg,
    },
    chart: {
      height: HEIGHT,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: theme.spacing.md,
      gap: theme.spacing.md,
    },
    legendLabel: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
    },
    struck: {
      height: 13,
      width: 88,
      backgroundColor: theme.colors.text.disabled,
    },
    legendValue: {
      ...theme.typography.amountRow,
      color: theme.colors.text.secondary,
    },
  });
}
