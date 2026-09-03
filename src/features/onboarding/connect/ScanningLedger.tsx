/**
 * A ledger being read.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 * The connect screen described its own mechanism in two paragraphs and then
 * asked the user to wait half a minute in front of a button reading "Reading
 * your alerts…". Both were the same missed opportunity: the app's entire pitch
 * is that a ledger fills itself from mail already arriving, and nowhere did it
 * SHOW that.
 *
 * So the idle state demonstrates the thing being offered, and the scanning
 * state is the same object doing the same work — one component, two tempos,
 * which is also why the transition between them is not a jump.
 *
 * ── It does not pretend to know how far along it is ──────────────────────
 * The obvious move for a thirty-second wait is a progress bar. There is no
 * progress to report: the server fetches forty messages and calls a model, and
 * neither reports a fraction. A bar filling at an invented rate is a lie the
 * user cannot check, and it breaks the moment it stalls at 90%.
 *
 * A sweep that repeats says "working" without claiming a position, which is
 * exactly as much as is honestly known.
 *
 * ── Why one path and a moving gradient ───────────────────────────────────
 * The obvious build is one animated element per row, which at seven rows means
 * seven shared values and seven derived opacities recomputed every frame. The
 * whole figure is instead a single path, drawn twice: once at rest, once under
 * a bright band that travels down it. The band is a gradient whose coordinates
 * move — one value animating, on the UI thread, whatever the row count.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Canvas, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';
import { useReducedMotion } from '@/design-system/motion/springs';

/** Entries in the drawn ledger. Enough to read as a page, few enough that each
 *  row keeps the generous leading the real ledger has. */
const ROWS = 7;
const ROW_GAP = 18;
const TICK_WIDTH = 2;
const TICK_HEIGHT = 12;
const RAIL = 14;
const RULE_HEIGHT = 2;

/** How far the bright band reaches above and below its centre. */
const BAND = 46;

/**
 * Row widths as fractions of the measure.
 *
 * Deliberately uneven and deliberately fixed. Random widths would shimmer on
 * every re-render, and equal widths would read as a loading skeleton rather
 * than as entries in a book.
 */
const WIDTHS = [0.92, 0.64, 0.81, 0.55, 0.88, 0.7, 0.44] as const;

export interface ScanningLedgerProps {
  /** `reading` is the live scan: faster, brighter, continuous. `resting` is
   *  the same figure demonstrating what the app does, at half the tempo. */
  readonly mode: 'reading' | 'resting';
}

export function ScanningLedger({ mode }: ScanningLedgerProps): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();

  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const height = ROWS * ROW_GAP;
  const sweep = useSharedValue(-BAND);

  useEffect(() => {
    if (reducedMotion || width <= 0) {
      // Parked below the figure, so the resting rules render at their own
      // colour and nothing moves.
      sweep.value = height + BAND * 2;
      return;
    }
    sweep.value = -BAND;
    sweep.value = withRepeat(
      withTiming(height + BAND, {
        duration: mode === 'reading' ? 1900 : 3800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(sweep);
    };
  }, [sweep, reducedMotion, width, height, mode]);

  /** The whole ledger: a tick and a rule per row. */
  const ledger = useMemo(() => {
    const path = Skia.Path.Make();
    if (width <= 0) return path;

    WIDTHS.slice(0, ROWS).forEach((fraction, index) => {
      const y = index * ROW_GAP + ROW_GAP / 2;

      // The 2px tick that marks a live field, a chosen picker row and a ledger
      // entry everywhere else in the app.
      path.addRect(
        Skia.XYWHRect(0, y - TICK_HEIGHT / 2, TICK_WIDTH, TICK_HEIGHT),
      );

      const ruleWidth = Math.max(0, (width - RAIL) * fraction);
      path.addRect(Skia.XYWHRect(RAIL, y - RULE_HEIGHT / 2, ruleWidth, RULE_HEIGHT));
    });

    return path;
  }, [width]);

  const bandStart = useDerivedValue(() => vec(0, sweep.value - BAND));
  const bandEnd = useDerivedValue(() => vec(0, sweep.value + BAND));

  return (
    <View style={[styles.block, { height }]} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* At rest. The page exists whether or not anything is reading it. */}
        <Path path={ledger} style="fill" color={theme.colors.rule.strong} />

        {/* The same page under a travelling light. Transparent at both ends so
            the band has no edge — a hard edge would read as a wipe rather than
            as something passing over. */}
        <Path path={ledger} style="fill">
          <LinearGradient
            start={bandStart}
            end={bandEnd}
            colors={[
              'transparent',
              theme.colors.action.base,
              theme.colors.action.base,
              'transparent',
            ]}
            positions={[0, 0.42, 0.58, 1]}
          />
        </Path>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: '100%',
  },
});
