/**
 * Record a transaction by hand.
 *
 * ── Why this screen exists at all ────────────────────────────────────────
 * Automatic capture reads bank alerts, and it only sees what the bank sends.
 * Cash never generates one. Some banks alert on credits and stay quiet on
 * debits. A wallet may not email at all. Manual entry is the floor beneath all
 * of that: whatever the pipeline misses, the user can still put in themselves.
 *
 * It is also the only capture route that works everywhere, which makes it the
 * one that has to be right on a device where nothing else has been set up.
 *
 * ── The order of the fields is the order of the thought ──────────────────
 * Amount, then direction, then who, then when, then which account. That is the
 * order someone recalls a payment in — "five thousand, went out, to Shoprite,
 * this afternoon" — rather than the order the API happens to list them.
 *
 * Category is last and optional, because the app will guess it and the guess
 * gets better as it learns. Asking for it up front would make an eight-second
 * task feel like paperwork; offering it at the end lets someone who cares be
 * exact without holding up someone who does not.
 *
 * ── The duplicate question is the point ──────────────────────────────────
 * The real risk in manual entry is not a mistyped field, it is recording money
 * the bank is about to report on its own. The server decides that (see
 * ReconciliationService), and everything it cannot decide alone comes back here
 * as a question rather than a guess. See DuplicateNotice.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { ActionButton, NoticeBand, RuledField } from '@/design-system/components';
import { RemoteCaptureRepository } from '@/core/repositories/capture/RemoteCaptureRepository';
import { AmountField } from '@/features/capture/components/AmountField';
import { DirectionToggle } from '@/features/capture/components/DirectionToggle';
import { ChoiceRow, type ChoiceOption } from '@/features/capture/components/ChoiceRow';
import { WhenField } from '@/features/capture/components/WhenField';
import { DuplicateNotice } from '@/features/capture/components/DuplicateNotice';
import { useManualEntry } from '@/features/capture/hooks/useManualEntry';
import { manualEntrySchema, type ManualEntryFormData } from '@/features/capture/schemas/manual-entry.schema';
import { nairaToKobo } from '@/features/capture/parsers/nairaToKobo';
import type { AccountSummary, CategorySummary } from '@/features/capture/types';

// The slug-to-label guess that used to live here is gone: the API now returns
// `displayName`. Deriving it read "-" as "and", which happened to be right for
// every current category — food-groceries, airtime-data, fees-charges — and
// would have been silently wrong for the first one where it is not.

export default function NewTransactionScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const merchantRef = useRef<TextInput>(null);

  const [accounts, setAccounts] = useState<readonly AccountSummary[]>([]);
  const [categories, setCategories] = useState<readonly CategorySummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { isSubmitting, error, errorCode, duplicate, submit, recordAnyway, dismissDuplicate, clearError } =
    useManualEntry();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ManualEntryFormData>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      amount: '',
      direction: 'DEBIT',
      merchantName: '',
      // Now, because the common case by a wide margin is recording something
      // that just happened — and this field is what the server matches bank
      // alerts against, so a good default prevents duplicates rather than
      // merely saving a tap.
      when: new Date(),
      accountId: '',
    },
  });

  const direction = watch('direction');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [loadedAccounts, loadedCategories] = await Promise.all([
          RemoteCaptureRepository.listAccounts(),
          RemoteCaptureRepository.listCategories(),
        ]);
        if (cancelled) return;

        setAccounts(loadedAccounts);
        setCategories(loadedCategories);

        // With one account there is no choice to make, so it is made. The row
        // still shows which account it is — preselected is not the same as
        // hidden, and the user is about to attach money to it.
        const only = loadedAccounts.length === 1 ? loadedAccounts[0] : undefined;
        if (only !== undefined) setValue('accountId', only.id, { shouldValidate: false });
      } catch {
        if (!cancelled) {
          setLoadError('Could not load your accounts. Check your connection and try again.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setValue]);

  const accountOptions: readonly ChoiceOption[] = useMemo(
    () =>
      accounts.map((account) => ({
        id: account.id,
        label: `${account.bankName} ···· ${account.accountLast4}`,
        detail: account.gmailConnected ? 'Bank alerts are connected' : undefined,
      })),
    [accounts],
  );

  const categoryOptions: readonly ChoiceOption[] = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.displayName })),
    [categories],
  );

  const onSubmit = useCallback(
    async (data: ManualEntryFormData): Promise<void> => {
      const kobo = nairaToKobo(data.amount);
      // The schema already rejects an unparseable amount; this narrows the type
      // rather than re-checking it.
      if (kobo === null) return;

      const created = await submit({
        accountId: data.accountId,
        amountKobo: kobo.toString(),
        type: data.direction,
        merchantName: data.merchantName,
        transactionDate: data.when.toISOString(),
        categoryId: data.categoryId,
      });

      if (created !== null) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    },
    [router, submit],
  );

  const handleRecordAnyway = useCallback(async (): Promise<void> => {
    const created = await recordAnyway();
    if (created !== null) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  }, [recordAnyway, router]);

  const hasNoAccounts = accounts.length === 0 && loadError === null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          accessibilityRole="button"
          accessibilityLabel="Close without saving"
        >
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
        <Text style={styles.title}>Record a transaction</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {loadError !== null && <NoticeBand message={loadError} />}
        {error !== null && <NoticeBand message={error} code={errorCode} />}

        {/* This band used to point at nothing: there was no screen anywhere in
            the app that could add an account, so the one instruction it gave
            was impossible to follow. */}
        {hasNoAccounts && (
          <>
            <NoticeBand message="Add an account first — a transaction has to belong to one." />
            <Pressable
              onPress={() => router.push('/(app)/connect')}
              accessibilityRole="button"
              style={styles.noticeAction}
              hitSlop={8}
            >
              <Text style={styles.noticeActionLabel}>Add an account</Text>
            </Pressable>
          </>
        )}

        <Controller
          control={control}
          name="amount"
          render={({ field: { value, onChange } }) => (
            <AmountField
              value={value}
              onChange={(next) => {
                clearError();
                onChange(next);
              }}
              direction={direction}
              error={errors.amount?.message}
              autoFocus
            />
          )}
        />

        <Controller
          control={control}
          name="direction"
          render={({ field: { value, onChange } }) => (
            <DirectionToggle value={value} onChange={onChange} />
          )}
        />

        <Controller
          control={control}
          name="merchantName"
          render={({ field: { value, onChange, onBlur } }) => (
            <RuledField
              ref={merchantRef}
              label={direction === 'DEBIT' ? 'Who you paid' : 'Who paid you'}
              index={1}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={direction === 'DEBIT' ? 'Shoprite, fuel, MTN, rent…' : 'Salary, a friend…'}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              error={errors.merchantName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="when"
          render={({ field: { value, onChange } }) => (
            <WhenField index={2} value={value} onChange={onChange} error={errors.when?.message} />
          )}
        />

        <Controller
          control={control}
          name="accountId"
          render={({ field: { value, onChange } }) => (
            <ChoiceRow
              index={3}
              label="Account"
              options={accountOptions}
              selectedId={value.length > 0 ? value : undefined}
              onSelect={onChange}
              placeholder="Choose an account"
              emptyMessage="You have not added an account yet."
              error={errors.accountId?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          render={({ field: { value, onChange } }) => (
            <ChoiceRow
              index={4}
              label="Category"
              options={categoryOptions}
              selectedId={value}
              onSelect={onChange}
              placeholder="Let the app decide"
              optional
            />
          )}
        />

        <Text style={styles.footnote}>
          If your bank emails an alert for this later, the two will be joined into one
          entry rather than counted twice.
        </Text>

        <View style={styles.commit}>
          <ActionButton
            label="Record it"
            loadingLabel="Recording…"
            loading={isSubmitting}
            disabled={hasNoAccounts}
            onPress={() => void handleSubmit(onSubmit)()}
          />
        </View>
      </ScrollView>

      {duplicate !== null && (
        <DuplicateNotice
          question={duplicate}
          onKeepExisting={() => {
            dismissDuplicate();
            router.back();
          }}
          onRecordAnyway={() => void handleRecordAnyway()}
          isSubmitting={isSubmitting}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      // Transparent: the Material layer at the root owns the ground colour.
      backgroundColor: 'transparent',
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.default,
    },
    close: {
      width: 44,
      height: 44,
      alignItems: 'flex-start',
      justifyContent: 'center',
      marginLeft: -theme.spacing.xs,
    },
    closePressed: {
      opacity: 0.5,
    },
    closeGlyph: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text.primary,
    },
    scroll: {
      paddingHorizontal: theme.spacing.lg,
    },
    noticeAction: {
      alignSelf: 'flex-start',
      paddingVertical: theme.spacing.md,
    },
    // Underlined, because it is the one way out of a screen that cannot
    // otherwise be completed — it has to read as a link, not a caption.
    noticeActionLabel: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
      textDecorationLine: 'underline',
    },
    footnote: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xl,
    },
    commit: {
      marginTop: theme.spacing.lg,
    },
  });
}
