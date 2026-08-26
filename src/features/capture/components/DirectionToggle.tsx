/**
 * DirectionToggle — did this money leave or arrive?
 *
 * ── Why this is two visible options and not a switch ─────────────────────
 * Direction is the one field on the form with no forgiving failure. A wrong
 * amount is off by some margin; a wrong direction is off by twice the amount
 * and points the wrong way, and it is invisible afterwards — a payment filed as
 * income looks like a perfectly ordinary row, just in the wrong column of a
 * total the user will not re-derive.
 *
 * A switch or a segmented pill states one label and asks the user to infer the
 * other from its position. Both states are written out here, side by side, with
 * the selected one filled: nothing has to be remembered or inferred, and the
 * answer is readable at a glance from across the room.
 *
 * ── Why the colour is the money colour ───────────────────────────────────
 * Jade for inbound, clay for outbound, exactly as they appear in the ledger.
 * This is the app's only chromatic vocabulary and it means precisely one thing,
 * so the choice made here is stated in the same colour the consequence will be.
 * The unselected side stays neutral, which keeps the pair from reading as two
 * competing accents.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import type { TransactionDirection } from '../types';

export interface DirectionToggleProps {
  readonly value: TransactionDirection;
  readonly onChange: (next: TransactionDirection) => void;
}

const OPTIONS: readonly { readonly value: TransactionDirection; readonly label: string; readonly hint: string }[] = [
  { value: 'DEBIT', label: 'Money out', hint: 'You paid or sent this' },
  { value: 'CREDIT', label: 'Money in', hint: 'You received this' },
];

export function DirectionToggle({ value, onChange }: DirectionToggleProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.block}>
      <Text style={styles.caption}>Direction</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          const tint =
            option.value === 'CREDIT' ? theme.colors.money.inbound : theme.colors.money.outbound;

          return (
            <Pressable
              key={option.value}
              onPress={() => {
                if (selected) return;
                void Haptics.selectionAsync();
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.option,
                selected && { borderColor: tint, backgroundColor: `${tint}1A` },
                pressed && !selected && styles.optionPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label}. ${option.hint}`}
            >
              <View style={styles.markRow}>
                <View style={[styles.mark, selected && { backgroundColor: tint }]} />
                <Text style={[styles.label, selected && { color: theme.colors.text.primary }]}>
                  {option.label}
                </Text>
              </View>
              <Text style={styles.hint}>{option.hint}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    block: {
      paddingTop: theme.spacing.lg,
    },
    caption: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    option: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.rule.strong,
      borderRadius: theme.radius.sm,
      // Comfortably past the 44/48pt minimum without needing a fixed height.
      minHeight: 62,
      justifyContent: 'center',
    },
    optionPressed: {
      backgroundColor: theme.colors.action.wash,
    },
    markRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    // The same 2px tick the ruled fields and ledger rows use for "this one is
    // live", so selection is stated the same way everywhere in the app.
    mark: {
      width: 2,
      height: 14,
      backgroundColor: theme.colors.rule.strong,
      marginRight: theme.spacing.sm,
    },
    label: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.secondary,
    },
    hint: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.hair,
      marginLeft: theme.spacing.sm + 2,
    },
  });
}
