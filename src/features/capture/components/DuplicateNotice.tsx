/**
 * DuplicateNotice — "you may already have this one".
 *
 * ── Why this is a question and not a rejection ───────────────────────────
 * The server compared this entry against the ledger on an exact account, an
 * exact amount and an exact direction, and found something close enough in time
 * and counterparty to be worth raising. Close enough is not the same as
 * certain, and the two ways of being wrong are not symmetrical:
 *
 *   silently record it   → the user's money is counted twice, in every total
 *   silently discard it  → a payment they really made is gone, invisibly
 *
 * Neither is acceptable to guess at, and the user is the only one here who
 * knows which it is. So this shows them the row it collided with — the amount,
 * the counterparty, the time, and where it came from — and lets them decide.
 *
 * ── Why the existing row is shown in full ────────────────────────────────
 * "This looks like a duplicate" is unanswerable. "You already have ₦5,000 to
 * Shoprite, from your bank alert, at 2:28 pm" is answerable in a second,
 * because it is the payment itself rather than a claim about it. Showing the
 * source matters too: a row that came from the bank is stronger evidence than
 * one the user typed, and it explains why the app is asking.
 *
 * ── The two answers are not weighted equally ─────────────────────────────
 * Keeping the existing record is the safe answer and the likely one, so it is
 * the filled control. Recording anyway is real and reachable, but stated
 * plainly rather than encouraged, because it is the one that can double a
 * balance.
 */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { formatKoboToNaira } from '@/shared/components/AmountDisplay/AmountDisplay';
import type { DuplicateQuestion } from '../hooks/useManualEntry';
import { describeWhen } from './WhenField';

export interface DuplicateNoticeProps {
  readonly question: DuplicateQuestion;
  readonly onKeepExisting: () => void;
  readonly onRecordAnyway: () => void;
  readonly isSubmitting: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  EMAIL: 'From your bank alert',
  SMS: 'From a bank SMS',
  MONO: 'From your linked bank',
  MANUAL: 'You entered this by hand',
};

export function DuplicateNotice({
  question,
  onKeepExisting,
  onRecordAnyway,
  isSubmitting,
}: DuplicateNoticeProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Read once, not during render. The sheet appears in response to an action
  // and lives for seconds, so a clock captured at mount is exact enough to say
  // "today" or "yesterday" and keeps rendering pure.
  const [now] = useState(() => new Date());

  const { existing, certainty } = question;
  const isOut = existing.type === 'DEBIT';
  const tint = isOut ? theme.colors.money.outbound : theme.colors.money.inbound;

  // The server distinguishes "this is already here" from "this looks similar",
  // and the wording follows it rather than flattening both into one hedge.
  const headline =
    certainty === 'already-recorded' ? 'You already have this one' : 'This looks like one you have';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onKeepExisting} accessibilityViewIsModal>
      <View style={styles.scrim}>
        <View style={styles.sheet} accessibilityRole="alert">
          <Text style={styles.headline}>{headline}</Text>
          {question.reason !== undefined && <Text style={styles.reason}>{question.reason}</Text>}

          <View style={styles.rule} />

          {/* The colliding row, as a ledger entry rather than a description of
              one — same shape the user reads everywhere else in the app. */}
          <View style={styles.entry}>
            <View style={[styles.mark, { backgroundColor: tint }]} />
            <View style={styles.entryBody}>
              <Text style={styles.merchant} numberOfLines={1}>
                {existing.merchantName}
              </Text>
              <Text style={styles.meta}>
                {describeWhen(new Date(existing.transactionDate), now)}
              </Text>
              <Text style={styles.source}>
                {SOURCE_LABEL[existing.source] ?? existing.source}
              </Text>
              {/* The bank's own id for the payment, where there is one. This is
                  not developer leakage: it is the single most convincing thing
                  on this sheet, because it is what the user would quote to
                  their bank, and it is the same value they can find on their
                  statement. Set in the number face, like the error code on a
                  NoticeBand. */}
              {existing.providerRef !== null && (
                <Text style={styles.reference} selectable>
                  {existing.providerRef}
                </Text>
              )}
            </View>
            <Text style={[styles.amount, { color: tint }]}>
              {isOut ? '−' : '+'}
              {formatKoboToNaira(BigInt(existing.amountKobo))}
            </Text>
          </View>

          <View style={styles.rule} />

          <Pressable
            onPress={onKeepExisting}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
            accessibilityRole="button"
            accessibilityHint="Discards what you just entered and keeps the record you already have"
          >
            <Text style={styles.primaryLabel}>Keep the one I have</Text>
          </Pressable>

          <Pressable
            onPress={onRecordAnyway}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
            accessibilityRole="button"
            accessibilityHint="Records your entry as a separate transaction"
          >
            <Text style={styles.secondaryLabel}>
              {isSubmitting ? 'Recording…' : 'These are different — record it'}
            </Text>
          </Pressable>
        </View>
      </View>
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

    entry: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    mark: {
      width: 2,
      height: 34,
      marginRight: theme.spacing.md,
    },
    entryBody: {
      flex: 1,
    },
    merchant: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
    meta: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.hair,
    },
    source: {
      ...theme.typography.micro,
      letterSpacing: 1.1,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.hair,
    },
    reference: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.hair,
    },
    amount: {
      ...theme.typography.amountRow,
      marginLeft: theme.spacing.md,
    },

    primary: {
      backgroundColor: theme.colors.action.base,
      borderRadius: theme.radius.sm,
      minHeight: 54,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryPressed: {
      backgroundColor: theme.colors.action.deep,
    },
    primaryLabel: {
      ...theme.typography.button,
      color: theme.colors.action.on,
    },
    secondary: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.xs,
    },
    secondaryPressed: {
      opacity: 0.6,
    },
    secondaryLabel: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
  });
}
