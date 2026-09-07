/**
 * The lesser of two actions.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * Four screens had written it themselves, and WhenSheet, connect.tsx,
 * ScopeSheet and DuplicateNotice had arrived at the same forty lines:
 * minHeight 50, centred, body type in text.secondary, opacity 0.6 while
 * pressed. Identical, and then not quite — ScopeSheet's copy had no pressed
 * style at all, so its Cancel was the one control in the app that gave no sign
 * of having been touched.
 *
 * That is what a missing primitive costs. Nobody decided ScopeSheet should
 * behave differently; the fourth person to need this button simply copied a
 * little less than the third.
 *
 * ── The two tones, and when each is right ────────────────────────────────
 * `bare` is for an action that sits directly beneath a filled ActionButton —
 * a Cancel under a Confirm. It is found by its position, and giving it a
 * border there would set it arguing with the button it is subordinate to.
 *
 * `outlined` is for an action standing on its own, with no primary above it to
 * borrow context from. A tester could not find "Connect your bank" on the
 * dashboard for exactly this reason: brass text among body text reads as
 * emphasis rather than as a control, and it measures 8.75:1, so contrast was
 * never what was missing.
 *
 * The edge is brass rather than a white rule. colors.rule.strong is 16% white,
 * which composites to 1.54:1 against the app's ground — WCAG asks a UI
 * component boundary to reach 3:1, and beneath that it is a line you have to
 * hunt for. An invisible border is not a cheaper button, it is the same bug
 * with more code.
 *
 * ── What this is not ─────────────────────────────────────────────────────
 * Not a replacement for ActionButton. That one carries the loading sweep and
 * the weight a committing action deserves. This is for the choice a person
 * makes when they do NOT want the thing the screen is proposing, which is why
 * it never shows a loading state: backing out is instant or it is not backing
 * out.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../ThemeProvider';
import type { AppTheme } from '../theme';

export interface QuietButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  /**
   * `bare` beneath a filled primary; `outlined` when standing alone.
   * See the header — the difference is whether there is anything nearby to
   * make it recognisable as a control.
   */
  readonly tone?: 'bare' | 'outlined';
  readonly accessibilityHint?: string;
  /** Defaults to `label`. Set it when the label alone is not a sentence. */
  readonly accessibilityLabel?: string;
}

export function QuietButton({
  label,
  onPress,
  disabled = false,
  tone = 'bare',
  accessibilityHint,
  accessibilityLabel,
}: QuietButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        tone === 'outlined' && styles.outlined,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      {...(accessibilityHint !== undefined ? { accessibilityHint } : {})}
    >
      <Text style={[styles.label, tone === 'outlined' && styles.outlinedLabel]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: {
      // Above the 44pt floor. This is frequently the last control on a sheet,
      // where a thumb arrives at speed and the screen edge is close.
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    outlined: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.action.base,
      borderRadius: theme.radius.md,
    },
    pressed: {
      opacity: 0.6,
    },
    disabled: {
      opacity: 0.4,
    },
    label: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    outlinedLabel: {
      ...theme.typography.bodyStrong,
      color: theme.colors.action.base,
    },
  });
}
