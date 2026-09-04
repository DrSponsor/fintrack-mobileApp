/**
 * Asking before something irreversible happens.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 * `Alert.alert()`. Three of them: removing an account, disconnecting an
 * inbox, signing out. The copy was written carefully and then handed to a
 * container that cannot be styled at all — a Material dialog on Android, a
 * UIAlertController on iOS, neither of which has ever seen this app's
 * palette, type or spacing.
 *
 * It is the most jarring possible moment for the design to fall away, because
 * these are precisely the moments a person is deciding whether to trust the
 * thing they are about to do. A screen that has been careful throughout, and
 * then asks its most consequential question in a borrowed voice, undercuts
 * itself exactly where it can least afford to.
 *
 * ── Same sheet as the duplicate notice, deliberately ─────────────────────
 * The app already had one modal vocabulary — scrim, raised sheet with a
 * hairline top edge, filled primary, plain secondary beneath. Inventing a
 * second for confirmations would mean two kinds of "the app is asking you
 * something", which is one more than any app needs.
 *
 * ── The safe answer is the one that is easy to reach ─────────────────────
 * The destructive action is a plain control and the safe one is the filled
 * button, which inverts the usual arrangement. That is the point: the button
 * a thumb lands on by default should be the one that cannot lose anything.
 * Destructive text takes the danger colour so it is unmistakable, but it is
 * never the thing with the visual weight.
 */
import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { ActionButton } from './ActionButton';

export interface ConfirmSheetProps {
  readonly visible: boolean;
  /** The question, as a question. */
  readonly title: string;
  /** What actually happens. Say the consequence, not a reassurance. */
  readonly body: string;
  /** The safe answer. Filled, and what a thumb reaches first. */
  readonly cancelLabel: string;
  /** The answer that does the thing. */
  readonly confirmLabel: string;
  /** Colours the confirm label as danger. For anything that loses data. */
  readonly destructive?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  body,
  cancelLabel,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmSheetProps): React.JSX.Element | null {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      // Android's back gesture reaches this. It must mean "no" — the same as
      // tapping the scrim — and never the destructive answer.
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Dismiss">
        {/* Stops a tap inside the sheet from closing it, without making the
            sheet itself announce as a button. */}
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <View style={styles.rule} />

          <ActionButton label={cancelLabel} loadingLabel={cancelLabel} onPress={onCancel} />

          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryLabel, destructive && styles.destructiveLabel]}>
              {confirmLabel}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.scrim,
    },
    sheet: {
      backgroundColor: theme.colors.surface.raised,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.rule.edge,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text.primary,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.sm,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.default,
      marginVertical: theme.spacing.lg,
    },
    secondary: {
      minHeight: 50,
      marginTop: theme.spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryPressed: {
      opacity: 0.6,
    },
    secondaryLabel: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    destructiveLabel: {
      color: theme.colors.state.danger,
    },
  });
}
