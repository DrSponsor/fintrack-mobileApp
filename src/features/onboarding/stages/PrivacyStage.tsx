/**
 * Stage 4 — The manifest.
 *
 * ── Why the shield went ──────────────────────────────────────────────────
 * The previous version was a shield with a checkmark drawn inside it. Two
 * problems, and the second is the serious one.
 *
 * It is the most reproduced security graphic in software — every bank, every
 * VPN, every password manager. And it ASSERTS rather than STATES. The copy on
 * this slide is specific and genuinely strong: can read alerts and nothing
 * else, cannot move your money, never sees your banking password. Three
 * concrete commitments. A shield says "trust us", which is what a product says
 * when it has nothing concrete to offer. The words were carrying the slide and
 * the picture was riding along.
 *
 * ── What this does instead ───────────────────────────────────────────────
 * It shows the boundary as a permissions manifest, and the ASYMMETRY is the
 * whole argument: one capability against three refusals, legible before a word
 * is read. Most apps cannot show this because most apps take more than they
 * need; being able to print the list is itself the claim.
 *
 * ── The three refusals are the three real fears ──────────────────────────
 * Not generic reassurance. Moving money is what people fear from a finance
 * app, the banking password is what they fear handing over, and "reads your
 * other messages" is the specific suspicion earned by an app that asks to read
 * SMS at all. Naming the fear is what makes a denial worth anything.
 *
 * ── Struck through, not marked in red ────────────────────────────────────
 * A line is drawn through each denied capability, left to right, one after
 * another. It is unambiguous without colour, it reuses the drawn-rule gesture
 * from the ruled form fields, and it lets you WATCH permissions being refused
 * rather than reading that they were.
 *
 * Red would have been the obvious move and it would have been wrong: here the
 * denials are the reassurance. Rendering them as errors would turn the best
 * slide in the flow into a list of problems. Refusals stay quiet and neutral;
 * the single granted line is the only thing that carries colour, in the jade
 * this app uses everywhere for "this went well".
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useReducedMotion } from '@/design-system/motion/springs';
import { easeOut, phase } from '../timeline';

/** One pass. This is the last slide before "Get started", so it is read once
 *  and then sat with — a sequence that restarts every few seconds would be
 *  fidgeting in the corner of the eye while someone decides. */
const DRAW_MS = 2600;

const CHECK_BOX = 18;
const CHECK = 'M 3 9.5 L 7.5 14 L 15 4.5';

const GRANTED = 'Read transaction alerts';

const DENIED: readonly string[] = [
  'Move or send your money',
  'See your banking password',
  'Read your other messages',
];

/** Each denied row opens 0.15 after the one above it. */
const ROW_START = 0.42;
const ROW_STAGGER = 0.15;

interface StageProps {
  readonly isActive: boolean;
}

export function PrivacyStage({ isActive }: StageProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const clock = useSharedValue(0);

  useEffect(() => {
    if (!isActive) {
      cancelAnimation(clock);
      clock.value = 0;
      return;
    }
    if (reducedMotion) {
      // Park on the finished frame — the completed manifest, not a half-struck
      // one, which would read as an error rather than a guarantee.
      clock.value = 1;
      return;
    }
    clock.value = 0;
    clock.value = withTiming(1, { duration: DRAW_MS, easing: Easing.linear });
    return () => cancelAnimation(clock);
  }, [isActive, reducedMotion, clock]);

  return (
    <View style={styles.stage}>
      <SectionHead label="CAN" from={0} clock={clock} styles={styles} />
      <GrantedRow clock={clock} styles={styles} theme={theme} />

      <SectionHead label="CANNOT" from={0.32} clock={clock} styles={styles} />
      {DENIED.map((label, index) => (
        <DeniedRow key={label} label={label} index={index} clock={clock} styles={styles} />
      ))}
    </View>
  );
}

// ── Section head ──────────────────────────────────────────────────────────

interface SectionHeadProps {
  readonly label: string;
  readonly from: number;
  readonly clock: SharedValue<number>;
  readonly styles: ReturnType<typeof createStyles>;
}

function SectionHead({ label, from, clock, styles }: SectionHeadProps): React.JSX.Element {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: easeOut(phase(clock.value, from, from + 0.1)),
  }));

  return (
    <Animated.View style={[styles.head, animatedStyle]}>
      <Text style={styles.headLabel}>{label}</Text>
      <View style={styles.headRule} />
    </Animated.View>
  );
}

// ── Granted ───────────────────────────────────────────────────────────────

interface GrantedRowProps {
  readonly clock: SharedValue<number>;
  readonly styles: ReturnType<typeof createStyles>;
  readonly theme: AppTheme;
}

function GrantedRow({ clock, styles, theme }: GrantedRowProps): React.JSX.Element {
  const checkPath = useMemo(() => Skia.Path.MakeFromSVGString(CHECK) ?? Skia.Path.Make(), []);

  const textStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, 0.1, 0.24));
    return { opacity: t, transform: [{ translateX: (1 - t) * -8 }] };
  });

  // Trimmed rather than faded: the tick is drawn, the way a form is signed.
  const checkEnd = useDerivedValue(() => easeOut(phase(clock.value, 0.2, 0.34)));

  return (
    <View style={styles.row}>
      <Animated.Text style={[styles.grantedLabel, textStyle]}>{GRANTED}</Animated.Text>
      <Canvas style={styles.check}>
        <Path
          path={checkPath}
          style="stroke"
          strokeWidth={2.2}
          strokeJoin="round"
          strokeCap="round"
          color={theme.colors.money.inbound}
          start={0}
          end={checkEnd}
        />
      </Canvas>
    </View>
  );
}

// ── Denied ────────────────────────────────────────────────────────────────

interface DeniedRowProps {
  readonly label: string;
  readonly index: number;
  readonly clock: SharedValue<number>;
  readonly styles: ReturnType<typeof createStyles>;
}

function DeniedRow({ label, index, clock, styles }: DeniedRowProps): React.JSX.Element {
  // The strike is an animated width, so the label has to report how wide it
  // actually rendered — `textDecorationLine` cannot be animated, and a strike
  // that simply appears has none of the force of one being drawn.
  const [measure, setMeasure] = useState(0);

  const onLayout = (event: LayoutChangeEvent): void => {
    const { width } = event.nativeEvent.layout;
    setMeasure((prev) => (prev === width ? prev : width));
  };

  const start = ROW_START + index * ROW_STAGGER;

  const textStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, start, start + 0.08));
    return { opacity: t, transform: [{ translateX: (1 - t) * -8 }] };
  });

  const strikeStyle = useAnimatedStyle(() => ({
    width: measure * easeOut(phase(clock.value, start + 0.05, start + 0.17)),
  }));

  return (
    <View style={styles.row}>
      <View>
        <Animated.Text style={[styles.deniedLabel, textStyle]} onLayout={onLayout}>
          {label}
        </Animated.Text>
        <Animated.View style={[styles.strike, strikeStyle]} pointerEvents="none" />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    stage: {
      justifyContent: 'center',
    },

    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xs,
    },
    headLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.6,
    },
    // Runs from the label to the edge, so the head reads as a printed section
    // divider rather than a caption floating above a list.
    headRule: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.default,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },

    grantedLabel: {
      ...theme.typography.subheading,
      color: theme.colors.text.primary,
      flex: 1,
    },
    check: {
      width: CHECK_BOX,
      height: CHECK_BOX,
    },

    // Dimmer than the granted line before anything is struck. The hierarchy is
    // the point: what the app CAN do is the foreground fact.
    deniedLabel: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    // Sits on the text's optical centre. Neutral, never red — see the header.
    strike: {
      position: 'absolute',
      left: 0,
      top: '50%',
      height: StyleSheet.hairlineWidth * 2,
      backgroundColor: theme.colors.text.tertiary,
    },
  });
}
