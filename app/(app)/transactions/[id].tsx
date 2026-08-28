/**
 * One transaction, in full.
 *
 * ── What this screen is for ──────────────────────────────────────────────
 * The list answers "what happened". This answers "what exactly happened, and
 * is it right" — which makes it the only place a correction can live. Every
 * piece of the categorisation system behind this app (a user's own preference
 * outranking the shared map, corrections reaching only as far as they should,
 * a merchant being promoted once enough separate people agree) is reachable
 * from exactly one control on this screen. Without it, all of that runs and
 * nobody can steer it.
 *
 * ── The layout is the same ledger, unfolded ──────────────────────────────
 * Amount at monument scale, then ruled rows on a fixed left rail. Deliberately
 * NOT a card: a boxed panel here would be the one place in the app that reads
 * as a generic form, and the row-on-a-rule is what the eye has been trained on
 * by every other screen.
 *
 * ── Only the category is editable ────────────────────────────────────────
 * Amount, date and counterparty come from the bank and are the record. A user
 * who could edit them could make their ledger disagree with their statement,
 * which is the one thing a ledger must never do. The category is the only
 * field that is a judgement rather than a fact, so it is the only one that
 * opens.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { NoticeBand, ActionButton } from '@/design-system/components';
import { ChoiceRow } from '@/features/capture/components/ChoiceRow';
import { ScopeSheet } from '@/features/transactions/components/ScopeSheet';
import { useTransactionDetail } from '@/features/transactions/hooks/useTransactionDetail';
import { entryTime, signedNaira } from '@/features/transactions/ledger';
import type { CorrectionScope } from '@/core/repositories/ledger/ILedgerRepository';
import type { CaptureSource } from '@/features/capture/types';

/** How the row got here, in the user's terms rather than the enum's. */
const ORIGIN: Readonly<Record<CaptureSource, string>> = {
  EMAIL: "Your bank's email alert",
  SMS: "Your bank's text alert",
  MANUAL: 'You entered it by hand',
  MONO: 'Your linked bank account',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Sunday, 23 Aug 2026" — written out, because this screen has the room and
 *  a date you are checking against a statement should not be abbreviated. */
function fullDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export default function TransactionDetailScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useTransactionDetail(id ?? '');

  // Held between the two steps: the user picks a category, then says how far
  // it reaches. Nothing is sent until the second answer.
  const [pending, setPending] = useState<string | null>(null);

  const { entry, categories, account, correct, lastCorrection } = detail;

  const categoryName = useCallback(
    (categoryId: string | undefined): string | undefined =>
      categories.find((c) => c.id === categoryId)?.displayName,
    [categories],
  );

  const options = useMemo(
    () => categories.map((c) => ({ id: c.id, label: c.displayName })),
    [categories],
  );

  const handlePick = useCallback(
    (categoryId: string) => {
      // Choosing the category it already has is not a correction.
      if (entry !== undefined && categoryId === entry.categoryId) return;
      setPending(categoryId);
    },
    [entry],
  );

  const handleScope = useCallback(
    (scope: CorrectionScope) => {
      if (pending === null) return;
      correct(pending, scope);
      setPending(null);
    },
    [pending, correct],
  );

  const inbound = entry?.type === 'CREDIT';
  const tint = inbound ? theme.colors.money.inbound : theme.colors.text.primary;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.back();
          }}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back to the ledger"
          hitSlop={8}
        >
          <Text style={styles.backGlyph}>←</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + theme.spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {detail.error !== null && <NoticeBand message={detail.error} />}

        {/* What actually happened, stated once the write has landed. A
            merchant-scoped correction can rewrite months of entries, and the
            user is told the figure rather than left to discover it. */}
        {lastCorrection !== null && (
          <NoticeBand
            tone="success"
            message={
              lastCorrection.backfilled > 0
                ? `Re-filed. ${lastCorrection.backfilled} earlier ${
                    lastCorrection.backfilled === 1 ? 'entry' : 'entries'
                  } changed too.`
                : 'Re-filed. Nothing else changed.'
            }
          />
        )}

        {entry === undefined ? (
          // A failed read leaves nothing to look at, so it gets a way out
          // rather than a blank screen under a red band.
          <View style={styles.blank}>
            <Text style={styles.loading}>{detail.loading ? 'Reading the entry…' : ''}</Text>
            {!detail.loading && detail.error !== null && (
              <ActionButton label="Try again" loadingLabel="Trying…" onPress={detail.retry} />
            )}
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroCaption}>{inbound ? 'Money in' : 'Money out'}</Text>
              <Text style={[styles.heroAmount, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit>
                {signedNaira(BigInt(entry.amountKobo), entry.type)}
              </Text>
              <Text style={styles.heroMerchant}>{entry.merchantName}</Text>
            </View>

            <View style={styles.ruleStrong} />

            {/* The one editable field. */}
            <ChoiceRow
              index={1}
              label="Category"
              options={options}
              selectedId={entry.categoryId}
              onSelect={handlePick}
              action="Change"
              placeholder="Not filed yet"
              emptyMessage="Categories have not loaded yet."
            />

            <Field index={2} label="When" value={`${fullDate(new Date(entry.transactionDate))}, ${entryTime(new Date(entry.transactionDate))}`} />

            <Field
              index={3}
              label="Account"
              value={
                account !== undefined
                  ? `${account.bankName} ···· ${account.accountLast4}`
                  : 'Loading…'
              }
            />

            <Field index={4} label="Recorded by" value={ORIGIN[entry.source]} />

            {/* Only shown when the bank stated one. A row reading "None" would
                be noise on every hand-entered transaction. */}
            {entry.providerRef !== null && (
              <Field index={5} label="Bank reference" value={entry.providerRef} technical selectable />
            )}

            <Text style={styles.footnote}>
              {entry.source === 'MANUAL'
                ? 'You entered this one. If your bank sends an alert for it later, the two are joined into a single entry rather than counted twice.'
                : 'This came from your bank, so the amount, date and counterparty are the record and cannot be edited here.'}
            </Text>
          </>
        )}
      </ScrollView>

      <ScopeSheet
        visible={pending !== null}
        merchantName={entry?.merchantName ?? 'this merchant'}
        categoryName={categoryName(pending ?? undefined) ?? 'a new category'}
        onChoose={handleScope}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

/** A read-only ruled row. Same rail and rule as RuledField, without the input. */
function Field({
  index,
  label,
  value,
  technical = false,
  selectable = false,
}: {
  readonly index: number;
  readonly label: string;
  readonly value: string;
  readonly technical?: boolean;
  readonly selectable?: boolean;
}): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.field}>
      <View style={styles.fieldCaption}>
        <Text style={styles.fieldIndex}>{String(index).padStart(2, '0')}</Text>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.fieldValueRow}>
        <View style={styles.rail} />
        <Text
          style={[styles.fieldValue, technical && styles.fieldValueTechnical]}
          selectable={selectable}
        >
          {value}
        </Text>
      </View>
      <View style={styles.rule} />
    </View>
  );
}

const RAIL = 26;

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      // The Material layer at the root owns the ground colour.
      backgroundColor: 'transparent',
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    back: {
      width: 44,
      height: 44,
      marginLeft: -theme.spacing.xs,
      justifyContent: 'center',
    },
    backGlyph: {
      ...theme.typography.heading,
      color: theme.colors.text.secondary,
    },
    body: {
      paddingHorizontal: theme.spacing.lg,
    },
    blank: {
      paddingTop: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    loading: {
      ...theme.typography.body,
      color: theme.colors.text.tertiary,
      paddingTop: theme.spacing.xl,
    },

    hero: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    heroCaption: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
      marginBottom: theme.spacing.sm,
    },
    heroAmount: {
      ...theme.typography.monument,
    },
    heroMerchant: {
      ...theme.typography.title,
      color: theme.colors.text.primary,
      marginTop: theme.spacing.md,
    },

    ruleStrong: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
    },

    field: {
      paddingTop: theme.spacing.lg,
    },
    fieldCaption: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    fieldIndex: {
      ...theme.typography.technicalSmall,
      width: RAIL,
      color: theme.colors.text.disabled,
    },
    fieldLabel: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
    },
    fieldValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 30,
    },
    rail: {
      width: RAIL,
    },
    fieldValue: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
      flex: 1,
    },
    // A reference is checked character by character against a statement, which
    // is what the number face is for.
    fieldValueTechnical: {
      ...theme.typography.technical,
      color: theme.colors.text.primary,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
      marginTop: theme.spacing.sm,
    },

    footnote: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xl,
    },
  });
}
