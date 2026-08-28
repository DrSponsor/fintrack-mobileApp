/**
 * AmountField — the figure the whole entry is about.
 *
 * ── Why this is not a RuledField ─────────────────────────────────────────
 * Every other field on the form describes the payment. This one IS the payment.
 * A wrong merchant name is untidy; a wrong amount is wrong money, and it
 * propagates into every balance, budget and total that reads it. So it gets the
 * monument scale and the top of the screen, and it is the only control here
 * that carries its own confirmation line.
 *
 * ── Why the text does not reformat as you type ───────────────────────────
 * The obvious move is to rewrite the field to "5,000.00" on every keystroke.
 * On a controlled React Native TextInput that means replacing the string under
 * the cursor, and the cursor does not reliably survive it — inserting a comma
 * shifts every character after it, and editing anywhere but the end can land
 * the caret in the wrong place. On a field where a misplaced digit is a
 * tenfold error in someone's money, that trade is not worth making for
 * cosmetics.
 *
 * So the input shows exactly what was typed, and the CONFIRMATION LINE below
 * shows what the app understood it to mean. That is strictly more informative
 * than live formatting: "₦5,000.00" under a typed "5000" tells the user their
 * keystrokes were read correctly, which is the thing they actually need to
 * know, and it is the same figure the ledger will show afterwards.
 *
 * The parse itself goes through nairaToKobo, which splits on the decimal point
 * and converts each side with BigInt. No amount in this app ever passes through
 * a float.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { formatKoboToNaira } from '@/shared/components/AmountDisplay/AmountDisplay';
import { nairaToKobo } from '../parsers/nairaToKobo';
import type { TransactionDirection } from '../types';

export interface AmountFieldProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly direction: TransactionDirection;
  readonly error?: string | undefined;
  readonly autoFocus?: boolean;
}

/**
 * Digits, at most one decimal point, at most two places after it. Commas are
 * dropped rather than blocked, so a paste of "1,234.56" is accepted.
 */
export function sanitiseAmountInput(raw: string): string {
  const stripped = raw.replace(/[^\d.]/g, '');
  const firstDot = stripped.indexOf('.');
  if (firstDot === -1) return stripped;

  const whole = stripped.slice(0, firstDot);
  const fraction = stripped.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
  return `${whole}.${fraction}`;
}

export function AmountField({
  value,
  onChange,
  direction,
  error,
  autoFocus = false,
}: AmountFieldProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const kobo = nairaToKobo(value);
  const isOut = direction === 'DEBIT';

  return (
    <View style={styles.block}>
      <Text style={styles.caption}>{isOut ? 'Amount out' : 'Amount in'}</Text>

      <View style={styles.figureRow}>
        <Text style={[styles.mark, value.length === 0 && styles.markIdle]}>₦</Text>
        <TextInput
          value={value}
          onChangeText={(next) => onChange(sanitiseAmountInput(next))}
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={theme.colors.text.disabled}
          // decimal-pad rather than numeric: numeric offers a full keyboard on
          // some Android skins, which puts a minus sign next to the digits on
          // a field where direction is a separate, deliberate choice.
          keyboardType="decimal-pad"
          selectionColor={theme.colors.action.base}
          cursorColor={theme.colors.action.base}
          autoFocus={autoFocus}
          accessibilityLabel={isOut ? 'Amount paid out' : 'Amount received'}
          maxLength={16}
          // The monument scale has no room to grow before it overflows.
          allowFontScaling={false}
        />
      </View>

      <View style={styles.rule} />

      {error !== undefined ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.confirm} accessibilityLiveRegion="polite">
          {kobo !== null && kobo > 0n ? formatKoboToNaira(kobo) : ' '}
        </Text>
      )}
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
    // `alignItems: 'baseline'` is the obvious choice here and it is wrong on
    // Android: Yoga cannot read a usable baseline from a TextInput, and
    // `includeFontPadding: false` on the input below moves the reference again.
    // The mark ends up aligned to the input's box BOTTOM rather than its
    // baseline, which drops the ₦ underneath the digits entirely.
    //
    // Bottom-align both boxes instead and nudge the mark onto the shared
    // baseline. Two sizes in two different families cannot baseline-align in
    // React Native without an offset, and the right offset depends on each
    // font's own descent metric — so the constant below was measured on device
    // rather than derived. Re-check it if either face or size changes.
    figureRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    mark: {
      ...theme.typography.display,
      color: theme.colors.text.secondary,
      marginRight: theme.spacing.xs,
      // translateY, not margin: this corrects where the glyph is PAINTED
      // without changing the row's height or the rule's position below it.
      transform: [{ translateY: -4 }],
    },
    markIdle: {
      color: theme.colors.text.disabled,
    },
    input: {
      ...theme.typography.monument,
      flex: 1,
      color: theme.colors.text.primary,
      // Both load-bearing on Android: TextInput ships invisible padding that
      // would push the figure off the rule the caption is aligned to.
      padding: 0,
      includeFontPadding: false,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
      marginTop: theme.spacing.sm,
    },
    confirm: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.sm,
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.state.danger,
      marginTop: theme.spacing.sm,
    },
  });
}
