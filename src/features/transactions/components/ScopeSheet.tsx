/**
 * ScopeSheet — how far a correction reaches.
 *
 * ── Why this is asked at all ─────────────────────────────────────────────
 * The server already picks a sensible default: a payment sitting in
 * `transfers` means the counterparty is a person, so a correction there
 * describes that payment; anything else is a business, where the counterparty
 * generally does determine the category. That default is right most of the
 * time and wrong in the case that costs the most.
 *
 * The case is ordinary: you send money to the same person for food one week
 * and a thrift contribution the next. Filing the second under Food would be a
 * mistake the user can see. Filing it under Food *and silently rewriting the
 * first one too* is a mistake they cannot — it edits history they already
 * looked at and moved past.
 *
 * The two errors are not symmetrical. A correction that failed to spread is
 * visible the next time that merchant appears; an unwanted rewrite of months
 * of entries is nearly invisible and destroys data nobody will revisit. So
 * this asks, and it states the consequence of each option in the words of the
 * actual merchant rather than the word "scope".
 *
 * ── The count is not promised ────────────────────────────────────────────
 * "Also updates 11 earlier entries" would be the better label, and it is not
 * offered: the number is only known after the write. Naming a count the screen
 * has not counted is worse than naming none, so the wide option describes its
 * reach and the result afterwards states the actual figure.
 */
import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { QuietButton } from '@/design-system/components';
import type { CorrectionScope } from '@/core/repositories/ledger/ILedgerRepository';

export interface ScopeSheetProps {
  readonly visible: boolean;
  /** The counterparty, named in the wide option so the reach is concrete. */
  readonly merchantName: string;
  /** What the user just chose, named so they can confirm they picked right. */
  readonly categoryName: string;
  readonly onChoose: (scope: CorrectionScope) => void;
  readonly onCancel: () => void;
}

export function ScopeSheet({
  visible,
  merchantName,
  categoryName,
  onChoose,
  onCancel,
}: ScopeSheetProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const choose = (scope: CorrectionScope) => () => {
    Haptics.selectionAsync().catch(() => {});
    onChoose(scope);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Dismiss">
        {/* Stops a tap inside the sheet from closing it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.headline}>Apply to which payments?</Text>
          <Text style={styles.reason}>
            You filed this one under {categoryName}.
          </Text>

          <View style={styles.rule} />

          <Pressable
            style={styles.option}
            onPress={choose('transaction')}
            accessibilityRole="button"
            accessibilityLabel={`Just this payment. Only this entry changes.`}
          >
            <View style={styles.optionMark} />
            <View style={styles.optionBody}>
              <Text style={styles.optionLabel}>Just this payment</Text>
              <Text style={styles.optionHint}>Nothing else in your ledger changes.</Text>
            </View>
          </Pressable>

          <View style={styles.ruleFaint} />

          <Pressable
            style={styles.option}
            onPress={choose('merchant')}
            accessibilityRole="button"
            accessibilityLabel={`Always for ${merchantName}. Earlier and future payments change too.`}
          >
            <View style={styles.optionMark} />
            <View style={styles.optionBody}>
              <Text style={styles.optionLabel} numberOfLines={2}>
                Always for {merchantName}
              </Text>
              <Text style={styles.optionHint}>
                Earlier payments to them are re-filed too, and future ones will be.
              </Text>
            </View>
          </Pressable>

          <View style={styles.rule} />

          <QuietButton label="Cancel" onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.surface.raised,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.rule.edge,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
    },
    headline: {
      ...theme.typography.heading,
      color: theme.colors.text.primary,
    },
    reason: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xs,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.default,
      marginVertical: theme.spacing.lg,
    },
    ruleFaint: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.faint,
    },
    // The same shape as a ledger row: a tick on a fixed rail, then the text.
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: theme.spacing.md,
      minHeight: 64,
    },
    optionMark: {
      width: 2,
      height: 34,
      backgroundColor: theme.colors.rule.strong,
      marginRight: theme.spacing.md,
    },
    optionBody: {
      flex: 1,
    },
    optionLabel: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
    optionHint: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.hair,
    },
  });
}
