/**
 * RollingNumber — the signature motion moment of the "Ledger" language.
 *
 * Each character position animates independently: when a value changes, only
 * the digits that actually changed move. They slide up when the value rises and
 * down when it falls, so the direction of the money is legible from the motion
 * alone, before you have read a single digit.
 *
 * ── Why it takes a bigint ────────────────────────────────────────────────
 * The component owns the diff, so the comparison happens on exact integer minor
 * units rather than on a formatted string or a float. That inherits the app's
 * no-float-arithmetic guarantee rather than quietly reintroducing rounding at
 * the presentation layer.
 *
 * ── Why there is no 0-9 reel ─────────────────────────────────────────────
 * A literal odometer reel (spinning through every intermediate digit) is a
 * skeuomorphic flourish that costs a tall clipped strip per slot and reads as
 * gimmicky at speed. Sliding the changed character out and the new one in is
 * what actually reads as expensive, and it handles separators, the currency
 * symbol and length changes uniformly instead of special-casing digits.
 *
 * ── Not for lists ────────────────────────────────────────────────────────
 * Each character is two Animated.Texts. That is the right budget for one hero
 * balance and the wrong budget for a scrolling ledger — use a plain Text with
 * the tabular `amountRow` token there.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SETTLE, useReducedMotion } from './springs';

type Direction = 1 | -1;

interface RollingNumberProps {
  /** Exact value in minor units. */
  readonly value: bigint;
  /** Formats `value` for display. Kept injectable so this component stays
   *  currency-agnostic — see the currency-coupling note in AmountDisplay. */
  readonly format: (value: bigint) => string;
  readonly style?: StyleProp<TextStyle>;
  /** Spoken instead of the per-character soup the slots would otherwise
   *  produce. Required, because a screen reader announcing thirteen separate
   *  characters is worse than no animation at all. */
  readonly accessibilityLabel: string;
}

export function RollingNumber({
  value,
  format,
  style,
  accessibilityLabel,
}: RollingNumberProps): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const formatted = format(value);

  // Same render-phase adjustment as Slot below — the previous value has to be
  // readable during render to pick a direction, which rules out a ref.
  const [tracked, setTracked] = useState({ previous: value, current: value });
  if (tracked.current !== value) {
    setTracked({ previous: tracked.current, current: value });
  }
  // Ties count as a rise so a first render, or a no-op update, never animates
  // downward for no reason.
  const direction: Direction = value >= tracked.previous ? 1 : -1;

  const flat = StyleSheet.flatten(style) ?? {};
  // Fall back through lineHeight → fontSize → a sane default, so the slide
  // distance always matches the actual rendered line box.
  const travel = flat.lineHeight ?? flat.fontSize ?? 24;

  if (reducedMotion) {
    return (
      <Text style={style} accessibilityLabel={accessibilityLabel} allowFontScaling={false}>
        {formatted}
      </Text>
    );
  }

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={accessibilityLabel}
      // The slots are decorative once the container carries the label; without
      // this a screen reader walks them one character at a time.
      importantForAccessibility="no-hide-descendants"
    >
      {formatted.split('').map((char, index) => (
        <Slot
          // Index-keyed on purpose: slots are positional, and reusing the
          // component at a position is exactly what lets the character at that
          // position animate rather than remount.
          key={index}
          char={char}
          direction={direction}
          travel={travel}
          textStyle={style}
        />
      ))}
    </View>
  );
}

interface SlotProps {
  readonly char: string;
  readonly direction: Direction;
  readonly travel: number;
  readonly textStyle: StyleProp<TextStyle>;
}

function Slot({ char, direction, travel, textStyle }: SlotProps): React.JSX.Element {
  // The outgoing and incoming characters are held as one piece of state so a
  // change arriving mid-flight simply becomes the next transition's starting
  // point, with no completion callback to race against.
  //
  // This is React's documented "adjusting state when a prop changes" pattern: a
  // *conditional* setState during render. React immediately re-renders and
  // discards the abandoned output without committing it, which is cheaper than
  // the effect-plus-extra-commit alternative. A ref would be the obvious
  // instinct here and is wrong — reading `.current` during render is exactly
  // the unsafe access `react-hooks/refs` exists to catch.
  const [pair, setPair] = useState({ from: char, to: char });
  const progress = useSharedValue(1);

  if (pair.to !== char) {
    setPair({ from: pair.to, to: char });
  }

  useEffect(() => {
    if (pair.from === pair.to) return;
    progress.value = 0;
    progress.value = withSpring(1, SETTLE);
  }, [pair, progress]);

  const outgoingStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -direction * travel * progress.value }],
  }));

  const incomingStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: direction * travel * (1 - progress.value) }],
  }));

  // Both layers are always mounted. At rest progress is 1, so the outgoing
  // layer sits at zero opacity and costs nothing visually — cheaper than the
  // conditional mount it replaces, which reintroduced the very re-render
  // sensitivity the ref above exists to avoid.
  return (
    <View style={styles.slot}>
      {/* The incoming character is in normal flow so it defines the slot's
          width; the outgoing one is overlaid. With tabular figures every digit
          is the same width, so nothing shifts. */}
      <Animated.Text style={[textStyle, incomingStyle]} allowFontScaling={false}>
        {pair.to}
      </Animated.Text>

      <Animated.Text
        style={[textStyle, styles.outgoing, outgoingStyle]}
        allowFontScaling={false}
      >
        {pair.from}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  slot: {
    // Clips the characters sliding in and out of the line box.
    overflow: 'hidden',
  },
  outgoing: {
    // Pinned to the top-left rather than absoluteFill: stretching the outgoing
    // text box to the slot's bounds would let it lay out differently from the
    // in-flow character it is replacing, so the two would not line up mid-slide.
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
