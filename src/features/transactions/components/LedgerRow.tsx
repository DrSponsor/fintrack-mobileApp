/**
 * LedgerRow — one entry in the ledger.
 *
 * ── Why this is a ruled row and not a card ───────────────────────────────
 * Every fintech list is a stack of floating cards on a dark ground. A ledger
 * is the opposite structure and the older one: entries separated by hairlines,
 * with a right-aligned amount column that the eye can run straight down. The
 * alignment is the whole point — it is what lets someone compare figures
 * without reading them, and it only works because the amounts are monospaced
 * and tabular, so ₦5,000.00 and ₦250,000.00 line up on the naira mark, the
 * separators and the kobo.
 *
 * ── Direction is stated by the tick and the sign, not by the amount ──────
 * Both colours live in the 2px tick. The amount itself is neutral when money
 * went out and jade when it came in.
 *
 * The first build coloured every amount, and on a real screen it was wrong:
 * ten rows of saturated clay reads as ten errors. Spending is the normal case
 * in a spending ledger — it is not an alert — and money arriving is the
 * exception worth marking. So the amount column stays monochrome except where
 * something genuinely stands out, which is also what a printed statement does
 * and why a statement is calm enough to read down.
 *
 * The sign carries the same information for anyone with a red-green
 * deficiency, which is precisely the axis jade and clay sit on, so the meaning
 * never depends on the colour being seen.
 *
 * ── The metadata line is deliberately thin ───────────────────────────────
 * Category and time only. Source, reference and verification status all belong
 * to the transaction and all matter — on the detail screen. A list is for
 * finding the row you want; putting everything on it means none of it reads.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { entryTime, signedNaira, type LedgerEntry } from '../ledger';

export interface LedgerRowProps {
  readonly entry: LedgerEntry;
  /** Resolved name for the entry's category, when it is known. */
  readonly categoryName: string | undefined;
  readonly onPress: (id: string) => void;
}

export function LedgerRow({ entry, categoryName, onPress }: LedgerRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const inbound = entry.type === 'CREDIT';
  const tint = inbound ? theme.colors.money.inbound : theme.colors.money.outbound;
  const when = new Date(entry.transactionDate);
  const amount = signedNaira(BigInt(entry.amountKobo), entry.type);

  // "Food & groceries · 2:28 pm", falling back to just the time rather than
  // printing a placeholder. A row that says "Uncategorised" teaches nothing;
  // one that simply omits the category says the same thing more quietly.
  const meta = categoryName !== undefined ? `${categoryName} · ${entryTime(when)}` : entryTime(when);

  return (
    <Pressable
      onPress={() => onPress(entry.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      // Read as one sentence rather than four fragments: a screen reader
      // announcing "Shoprite, minus, 5,000 naira" is parsing punctuation aloud.
      accessibilityLabel={`${entry.merchantName}, ${inbound ? 'received' : 'paid'} ${amount.slice(1)}, ${meta}`}
    >
      <View style={[styles.tick, { backgroundColor: tint }]} />
      <View style={styles.body}>
        <Text style={styles.merchant} numberOfLines={1}>
          {entry.merchantName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text
        style={[styles.amount, inbound && { color: theme.colors.money.inbound }]}
        numberOfLines={1}
      >
        {amount}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.gutter,
      minHeight: 64,
      // The separator, not a border on a card. Faint rather than default: at
      // one rule per row a stronger line turns the list into a grid.
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.faint,
    },
    rowPressed: {
      backgroundColor: theme.colors.action.wash,
    },
    // The same 2px mark that shows a live field and a chosen option. "This one"
    // is stated identically everywhere in the app.
    tick: {
      width: 2,
      height: 34,
      marginRight: theme.spacing.md,
    },
    body: {
      flex: 1,
      // Without this the merchant name refuses to truncate and instead pushes
      // the amount column off the right edge — flex children default to
      // min-width auto, which means "at least my content".
      minWidth: 0,
    },
    merchant: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
    meta: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.hair,
    },
    amount: {
      ...theme.typography.amountRow,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.md,
    },
  });
}
