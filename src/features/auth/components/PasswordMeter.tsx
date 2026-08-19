/**
 * PasswordMeter — five progress bars and one plain sentence.
 *
 * ── Two wrong answers this sits between ──────────────────────────────────
 *
 * THE CHECKLIST. Five stacked rows, each a tick or a cross beside a sentence.
 * It is the default solution, it costs eighty vertical pixels on the one screen
 * where the keyboard can least afford them, and it shows the user five
 * simultaneous failures at the moment they are trying to join.
 *
 * THE SPEC STRIP. Which is what replaced it, and was worse in a subtler way:
 * five bars over the notation `8+ A–Z a–z 0–9 SYM`. Dense, precise, and
 * unreadable to anyone who does not already write regular expressions. `SYM` is
 * an abbreviation you have to be told; `A–Z` and `a–z` are near-identical at
 * 11px. It looked like an instrument, which was the goal, and communicated
 * nothing, which was not.
 *
 * ── What this does instead ───────────────────────────────────────────────
 * The bars stay, because a bar is wordless and universally understood — it is
 * the part that was never the problem. The notation goes, replaced by one
 * sentence in plain language naming everything still outstanding:
 *
 *     Still needs a capital letter and a symbol.
 *
 * ALL of it at once, not one item at a time. Progressive hints look kinder but
 * turn password creation into whack-a-mole: add a capital, now add a number,
 * now add a symbol. Naming the full remainder lets someone compose one password
 * that satisfies everything, and the sentence visibly shortens as they type,
 * which is its own quiet feedback.
 *
 * Before the first keystroke it states the requirements as an invitation rather
 * than a complaint, so nothing is a surprise and nothing is yet a failure.
 *
 * ── The one moment ───────────────────────────────────────────────────────
 * When the fifth rule lands, the bars turn jade in a short left-to-right
 * stagger. Jade is the app's "this went well" signal — inbound money, the
 * privacy check — so the meter seals with the same gesture the rest of the
 * interface uses for confirmation. It is the only colour change on the screen,
 * and it happens once.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { SNAP, timing, useReducedMotion } from '@/design-system/motion/springs';
import type { PasswordStrength } from '../schemas/auth.schemas';

/** Delay between adjacent bars as the meter seals. Short enough to read as one
 *  gesture rather than five separate events. */
const SEAL_STAGGER_MS = 55;

interface Rule {
  readonly key: keyof Omit<PasswordStrength, 'isValid'>;
  /** Plain language, and deliberately plain: "capital" and "small" are how
   *  letters are taught, where "uppercase" and "lowercase" are how software
   *  documentation talks. */
  readonly phrase: string;
}

const RULES: readonly Rule[] = [
  { key: 'hasMinLength', phrase: 'at least 8 characters' },
  { key: 'hasUppercase', phrase: 'a capital letter' },
  { key: 'hasLowercase', phrase: 'a small letter' },
  { key: 'hasDigit', phrase: 'a number' },
  { key: 'hasSpecial', phrase: 'a symbol' },
];

const OPENING_HINT =
  'Use at least 8 characters, with a capital letter, a number and a symbol.';

/** "a, b and c" — no assertions, so an empty list is simply an empty string. */
function joinPhrases(phrases: readonly string[]): string {
  const last = phrases[phrases.length - 1] ?? '';
  const rest = phrases.slice(0, -1).join(', ');
  return rest.length > 0 ? `${rest} and ${last}` : last;
}

export interface PasswordMeterProps {
  readonly strength: PasswordStrength;
  /** Whether anything has been typed. Before the first keystroke the meter
   *  invites rather than reports — nothing has failed yet. */
  readonly touched: boolean;
}

export function PasswordMeter({ strength, touched }: PasswordMeterProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const outstanding = RULES.filter((rule) => !strength[rule.key]);

  const hint = strength.isValid
    ? 'Strong password.'
    : touched
      ? `Still needs ${joinPhrases(outstanding.map((rule) => rule.phrase))}.`
      : OPENING_HINT;

  return (
    <View
      style={styles.meter}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={hint}
      accessibilityValue={{ min: 0, max: RULES.length, now: RULES.length - outstanding.length }}
    >
      <View style={styles.bars}>
        {RULES.map((rule, index) => (
          <Bar
            key={rule.key}
            index={index}
            met={strength[rule.key]}
            valid={strength.isValid}
            styles={styles}
            theme={theme}
          />
        ))}
      </View>

      <Hint text={hint} valid={strength.isValid} styles={styles} theme={theme} />
    </View>
  );
}

// ── Hint ──────────────────────────────────────────────────────────────────

interface HintProps {
  readonly text: string;
  readonly valid: boolean;
  readonly styles: ReturnType<typeof createStyles>;
  readonly theme: AppTheme;
}

function Hint({ text, valid, styles, theme }: HintProps): React.JSX.Element {
  const seal = useSharedValue(valid ? 1 : 0);

  useEffect(() => {
    seal.value = withTiming(valid ? 1 : 0, timing.base);
  }, [seal, valid]);

  const animatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      seal.value,
      [0, 1],
      [theme.colors.text.tertiary, theme.colors.money.inbound],
    ),
  }));

  // Two lines are reserved whether or not they are used, so the button below
  // never moves as the sentence shortens.
  return (
    <View style={styles.hintBox}>
      <Animated.Text style={[styles.hint, animatedStyle]}>{text}</Animated.Text>
    </View>
  );
}

// ── Bar ───────────────────────────────────────────────────────────────────

interface BarProps {
  readonly index: number;
  readonly met: boolean;
  readonly valid: boolean;
  readonly styles: ReturnType<typeof createStyles>;
  readonly theme: AppTheme;
}

function Bar({ index, met, valid, styles, theme }: BarProps): React.JSX.Element {
  const reducedMotion = useReducedMotion();

  const fill = useSharedValue(met ? 1 : 0);
  const seal = useSharedValue(valid ? 1 : 0);

  useEffect(() => {
    fill.value = reducedMotion ? (met ? 1 : 0) : withSpring(met ? 1 : 0, SNAP);
  }, [fill, met, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      seal.value = valid ? 1 : 0;
      return;
    }
    // Stagger only on the way in. Unsealing is a correction, and a correction
    // that ripples looks like a glitch.
    seal.value = valid
      ? withDelay(index * SEAL_STAGGER_MS, withTiming(1, timing.base))
      : withTiming(0, timing.quick);
  }, [index, reducedMotion, seal, valid]);

  const animatedStyle = useAnimatedStyle(() => {
    const restingToMet = interpolateColor(
      fill.value,
      [0, 1],
      [theme.colors.rule.strong, theme.colors.text.primary],
    );
    return {
      // Unmet bars sit at half height, so progress is legible at a glance
      // before any colour is involved.
      transform: [{ scaleY: 0.5 + fill.value * 0.5 }],
      backgroundColor: interpolateColor(
        seal.value,
        [0, 1],
        [restingToMet, theme.colors.money.inbound],
      ),
    };
  });

  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    meter: {
      marginTop: theme.spacing.md,
    },

    bars: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    bar: {
      flex: 1,
      height: 4,
    },

    hintBox: {
      marginTop: theme.spacing.sm,
      minHeight: theme.typography.caption.lineHeight * 2,
    },
    hint: {
      ...theme.typography.caption,
    },
  });
}
