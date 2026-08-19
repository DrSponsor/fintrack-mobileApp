/**
 * RuledField — the text input for the "Ledger" language.
 *
 * ── Why this is not a box ─────────────────────────────────────────────────
 * A rounded rectangle with a 1px border and a placeholder inside it is the
 * single most reproduced control in software. It is what every UI kit ships,
 * so a screen full of them reads as assembled no matter how good the palette
 * is. This is a *ruled form field* instead: a caption above, the value written
 * on the rule, and the rule running the full measure. It is how a printed form
 * has worked for two hundred years, and it is the same hairline vocabulary the
 * ledger rows and the breakdown table already use.
 *
 * ── The parts, and why each exists ───────────────────────────────────────
 *
 *   THE INDEX (01, 02). Carried over from the welcome screen's ledger. It
 *   numbers the form as a document, and it hands the eye a fixed left rail to
 *   run down — the caption, the value and the number all start at one x.
 *
 *   THE MARKER. A 2px vertical tick that grows into place on focus. It is the
 *   same mark the capture stage uses for a parsed entry, so "this line is
 *   live" is stated the same way everywhere in the app.
 *
 *   THE DRAWN RULE. On focus a brighter rule is drawn left-to-right over the
 *   resting one, rather than the border simply changing colour. Colour changes
 *   are instant and therefore easy to miss; a line being drawn has direction
 *   and duration, so the eye follows it to the field it just landed in.
 *
 * ── The whole block is the touch target ──────────────────────────────────
 * This is the one real weakness of a ruled field over a box, and it is worth
 * being explicit about because it is invisible in a screenshot.
 *
 * A box draws its own target: the rectangle you see is the rectangle you tap.
 * A rule draws a line, and if only the TextInput is tappable then the caption,
 * the rule and the space around them are all dead — a 30px strip in a block
 * roughly 70px tall. Tapping a label and getting no keyboard is how a control
 * stops feeling like a control, and two misses is all it takes.
 *
 * So the entire field — caption row, value row and rule — is one Pressable
 * that focuses the input. The target ends up LARGER than the equivalent boxed
 * field's, comfortably past the 44/48pt minimums, while the visual stays a
 * line. The affordance people associate with boxes is really about target
 * size, and target size is free.
 *
 * ── Three implementation notes ───────────────────────────────────────────
 *
 *   The drawn rule animates measured WIDTH, not scaleX. scaleX always scales
 *   about the centre, so the line would open from the middle outwards, and
 *   transformOrigin is not dependable across the versions this app targets.
 *   The field measures itself on layout, which is also how the breakdown table
 *   sizes its data bars.
 *
 *   padding 0 and includeFontPadding false are load-bearing on Android:
 *   TextInput ships with invisible padding that would push the value off the
 *   rail the caption is aligned to, and the entire point of this control is
 *   that those two share an edge.
 *
 *   The ref is merged rather than simply forwarded: the parent needs it to move
 *   focus between fields, and the Pressable needs it to focus on tap. Both hold
 *   the same node.
 */
import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
  type TextInputProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';
import type { AppTheme } from '../theme';
import { SETTLE, timing, useReducedMotion } from '../motion/springs';

export interface RuledFieldProps extends Omit<TextInputProps, 'style'> {
  /** Caption above the rule. Set in micro caps. */
  readonly label: string;
  /** 1-based position in the form; rendered zero-padded as 01, 02, … */
  readonly index: number;
  /** Validation message. Its presence also recolours the resting rule. */
  readonly error?: string | undefined;
  /** Optional control on the right of the caption row — e.g. a SHOW toggle. */
  readonly trailing?: React.ReactNode;
}

/** Width of the left rail. Index, marker and value all start here. */
const RAIL = 26;
const INPUT_HEIGHT = 30;

export const RuledField = forwardRef<TextInput, RuledFieldProps>(function RuledField(
  { label, index, error, trailing, onFocus, onBlur, ...inputProps },
  ref,
) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const focus = useSharedValue(0);
  // The drawn rule needs a pixel target; percentage widths cannot be
  // interpolated on the UI thread.
  const [measure, setMeasure] = useState(0);

  // Held locally so a tap anywhere in the block can focus the input, while the
  // forwarded ref still reaches the parent for next-field focus.
  const inputRef = useRef<TextInput | null>(null);

  const setRefs = useCallback(
    (node: TextInput | null): void => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref !== null) {
        ref.current = node;
      }
    },
    [ref],
  );

  const handleLayout = (event: LayoutChangeEvent): void => {
    setMeasure(event.nativeEvent.layout.width);
  };

  const focusInput = useCallback((): void => {
    inputRef.current?.focus();
  }, []);

  const handleFocus = (event: NativeSyntheticEvent<TextInputFocusEventData>): void => {
    focus.value = reducedMotion ? 1 : withSpring(1, SETTLE);
    onFocus?.(event);
  };

  const handleBlur = (event: NativeSyntheticEvent<TextInputFocusEventData>): void => {
    // Leaving is a timing, not a spring: the field is no longer the subject, so
    // it recedes quietly rather than settling with a character of its own.
    focus.value = reducedMotion ? 0 : withTiming(0, timing.quick);
    onBlur?.(event);
  };

  const drawnRuleStyle = useAnimatedStyle(() => ({
    width: measure * focus.value,
    opacity: focus.value,
  }));

  const markerStyle = useAnimatedStyle(() => ({
    opacity: focus.value,
    transform: [{ scaleY: 0.4 + focus.value * 0.6 }],
  }));

  const indexStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      focus.value,
      [0, 1],
      [theme.colors.text.disabled, theme.colors.text.secondary],
    ),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      focus.value,
      [0, 1],
      [theme.colors.text.tertiary, theme.colors.text.primary],
    ),
  }));

  return (
    <View style={styles.field} onLayout={handleLayout}>
      {/* The whole block is the target — see the header note. `accessible` is
          deliberately NOT set here: it would collapse the caption, the input
          and the error into one node and hide the text field's own role and
          value from the screen reader. The TextInput stays the accessible
          element; this Pressable only widens where a sighted user may tap. */}
      <Pressable onPress={focusInput} accessible={false}>
        <View style={styles.captionRow}>
          <Animated.Text style={[styles.index, indexStyle]}>
            {String(index).padStart(2, '0')}
          </Animated.Text>
          <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
          {/* Rendered outside the Pressable's press area would be ideal, but
              nesting is fine: a Pressable child (the SHOW toggle) wins the
              touch over its parent. */}
          {trailing}
        </View>

        <View style={styles.valueRow}>
          <View style={styles.rail}>
            <Animated.View style={[styles.marker, markerStyle]} />
          </View>
          <TextInput
            ref={setRefs}
            style={styles.input}
            placeholderTextColor={theme.colors.text.disabled}
            selectionColor={theme.colors.action.base}
            cursorColor={theme.colors.action.base}
            accessibilityLabel={label}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...inputProps}
          />
        </View>

        <View style={[styles.rule, error !== undefined && styles.ruleError]} />
        <Animated.View style={[styles.ruleDrawn, drawnRuleStyle]} pointerEvents="none" />
      </Pressable>

      {error !== undefined && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    field: {
      paddingTop: theme.spacing.md,
    },

    captionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    index: {
      ...theme.typography.technicalSmall,
      width: RAIL,
    },
    label: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      flex: 1,
    },

    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: INPUT_HEIGHT,
    },
    rail: {
      width: RAIL,
      justifyContent: 'center',
    },
    marker: {
      width: 2,
      height: 18,
      backgroundColor: theme.colors.action.base,
    },
    input: {
      ...theme.typography.credential,
      flex: 1,
      color: theme.colors.text.primary,
      height: INPUT_HEIGHT,
      // Both load-bearing on Android — see the header note.
      padding: 0,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },

    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
      marginTop: theme.spacing.sm,
    },
    ruleError: {
      backgroundColor: theme.colors.state.danger,
    },
    // Sits over the resting rule and opens left-to-right. Drawn a full pixel
    // rather than a hairline so the focused field is unmistakable.
    ruleDrawn: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: 1,
      backgroundColor: theme.colors.action.base,
    },

    error: {
      ...theme.typography.caption,
      color: theme.colors.state.danger,
      marginTop: theme.spacing.xs,
      marginLeft: RAIL,
    },
  });
}
