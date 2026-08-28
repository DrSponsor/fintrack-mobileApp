/**
 * ChoiceRow — a ruled row that opens a list of options.
 *
 * The ledger vocabulary applied to a select: caption on the left rail, the
 * chosen value written on the line, a hairline underneath. No box, no chevron
 * inside a rounded rectangle. The whole row is the target, for the same reason
 * RuledField makes its whole block one — a line is thinner than a finger, and
 * target size is free.
 *
 * The options list is a plain Modal rather than a bottom sheet. It is a short
 * list that appears, gets one tap, and leaves; a gesture-driven sheet would add
 * a dependency and a drag surface to a control that never needs either.
 */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';

export interface ChoiceOption {
  readonly id: string;
  readonly label: string;
  /** Second line in the list — an account's bank, a category's group. */
  readonly detail?: string | undefined;
}

export interface ChoiceRowProps {
  readonly label: string;
  readonly options: readonly ChoiceOption[];
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
  /** Shown when nothing is chosen yet. */
  readonly placeholder: string;
  readonly error?: string | undefined;
  /** Shown in place of the list when there is nothing to choose from. */
  readonly emptyMessage?: string;
  readonly optional?: boolean;
  /**
   * 1-based position on the form's left rail, rendered zero-padded as 01, 02.
   * Same shape as RuledField's, so a screen numbers every field the same way. Optional because not every
   * screen numbers its fields — but when a screen numbers ANY of them it must
   * number all of them, or the sequence reads 02, 03, 04 with a hole where 01
   * should be and the unnumbered row sits off the rail every other row shares.
   */
  readonly index?: number;
}

export function ChoiceRow({
  label,
  options,
  selectedId,
  onSelect,
  placeholder,
  error,
  emptyMessage = 'Nothing to choose from yet.',
  optional = false,
  index,
}: ChoiceRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.id === selectedId);

  return (
    <View style={styles.block}>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected?.label ?? placeholder}`}
        accessibilityHint="Opens a list of options"
      >
        <View style={styles.captionRow}>
          {index !== undefined && (
            <Text style={styles.index}>{String(index).padStart(2, '0')}</Text>
          )}
          <Text style={styles.caption}>{label}</Text>
          <View style={styles.captionSpacer} />
          {optional && <Text style={styles.optional}>Optional</Text>}
        </View>
        <View style={styles.valueRow}>
          {index !== undefined && <View style={styles.rail} />}
          <Text style={[styles.value, selected === undefined && styles.valueEmpty]} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
        </View>
      </Pressable>

      <View style={[styles.rule, error !== undefined && styles.ruleError]} />
      {error !== undefined && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        // Announced as a dialog so a screen reader traps focus inside it.
        accessibilityViewIsModal
      >
        {/* Tapping the scrim closes. The sheet is a Pressable purely to absorb
            touches: in React Native the responder system hands a touch to the
            innermost view that claims it, so a press inside the sheet never
            reaches the scrim behind it. There is no event to stop — a
            no-op onPress is the whole mechanism. */}
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel="Close">
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <View style={styles.sheetRule} />

            {options.length === 0 ? (
              <Text style={styles.empty}>{emptyMessage}</Text>
            ) : (
              <ScrollView style={styles.list} bounces={false}>
                {options.map((option) => {
                  const isSelected = option.id === selectedId;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        onSelect(option.id);
                        setOpen(false);
                      }}
                      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={[styles.mark, isSelected && styles.markOn]} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemLabel, isSelected && styles.itemLabelOn]}>
                          {option.label}
                        </Text>
                        {option.detail !== undefined && (
                          <Text style={styles.itemDetail}>{option.detail}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Left rail width. Must match RuledField, or numbered rows drift apart. */
const RAIL = 26;

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    block: {
      paddingTop: theme.spacing.lg,
    },
    row: {
      minHeight: 48,
      justifyContent: 'center',
    },
    rowPressed: {
      opacity: 0.6,
    },
    captionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    // Same rail width as RuledField, so a numbered ChoiceRow and a numbered
    // RuledField put their captions and values on exactly one left edge.
    index: {
      ...theme.typography.technicalSmall,
      width: RAIL,
      color: theme.colors.text.disabled,
    },
    // Pushes "Optional" to the right without space-between, which would also
    // push the label away from its index.
    captionSpacer: {
      flex: 1,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rail: {
      width: RAIL,
    },
    caption: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
    },
    optional: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.disabled,
    },
    value: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
      marginTop: theme.spacing.xs,
    },
    valueEmpty: {
      color: theme.colors.text.disabled,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
      marginTop: theme.spacing.sm,
    },
    ruleError: {
      backgroundColor: theme.colors.state.danger,
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.state.danger,
      marginTop: theme.spacing.xs,
    },

    scrim: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.surface.raised,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.rule.edge,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
      maxHeight: '70%',
    },
    sheetTitle: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing.md,
    },
    sheetRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.default,
    },
    list: {
      marginTop: theme.spacing.xs,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      minHeight: 52,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.faint,
    },
    itemPressed: {
      backgroundColor: theme.colors.action.wash,
    },
    mark: {
      width: 2,
      height: 18,
      backgroundColor: 'transparent',
      marginRight: theme.spacing.md,
    },
    markOn: {
      backgroundColor: theme.colors.action.base,
    },
    itemText: {
      flex: 1,
    },
    itemLabel: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    itemLabelOn: {
      color: theme.colors.text.primary,
    },
    itemDetail: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.hair,
    },
    empty: {
      ...theme.typography.body,
      color: theme.colors.text.tertiary,
      paddingVertical: theme.spacing.xl,
      textAlign: 'center',
    },
  });
}
