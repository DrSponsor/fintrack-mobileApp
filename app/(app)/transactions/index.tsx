/**
 * The ledger.
 *
 * ── Four states, and the difference between two of them matters ──────────
 * Loading, empty, failed, and populated. The one worth being careful about is
 * empty versus failed: "you have no transactions" and "we could not fetch your
 * transactions" look identical if both render as a blank screen, and they lead
 * a person to do opposite things. A new user seeing a network failure phrased
 * as emptiness concludes the app does not work. Same reasoning as the
 * dashboard's null balance — not knowing is not the same as nothing.
 *
 * A failure that arrives when rows are ALREADY on screen is different again:
 * it appears as a band above the list, and the rows stay. Stale money the user
 * can still read beats an error screen that throws it away.
 *
 * ── Why FlashList and not ScrollView ─────────────────────────────────────
 * The ledger is designed to grow without limit and the New Architecture is
 * off, so every row that exists is a real view held in memory. FlashList
 * recycles them. `getItemType` is what keeps that cheap here: day headings and
 * entries have different heights, and without the hint the recycler swaps
 * between the two shapes and re-measures constantly.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { ActionButton, NoticeBand } from '@/design-system/components';
import { Skeleton } from '@/shared/components/Skeleton';
import { useLedger } from '@/features/transactions/hooks/useLedger';
import { LedgerRow } from '@/features/transactions/components/LedgerRow';
import { DayHeading } from '@/features/transactions/components/DayHeading';
import type { LedgerItem } from '@/features/transactions/ledger';

/** Roughly a row; FlashList only needs this to be in the right neighbourhood. */
const ESTIMATED_ROW = 64;

export default function TransactionsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { items, status, error, refreshing, loadingMore, categoryName, refresh, loadMore } =
    useLedger();

  // The hook already loads on mount, so acting on the first focus would fetch
  // the same page twice. Every focus after that is worth refetching: the user
  // has usually just come back from recording something, and a ledger missing
  // the entry they just made is the one thing it cannot be.
  const settled = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!settled.current) {
        settled.current = true;
        return;
      }
      refresh();
    }, [refresh]),
  );

  const openDetail = useCallback(
    (id: string) => router.push(`/(app)/transactions/${id}`),
    [router],
  );

  const openEntry = useCallback(() => router.push('/(app)/transactions/new'), [router]);

  const renderItem = useCallback(
    ({ item }: { item: LedgerItem }) => {
      if (item.kind === 'day') return <DayHeading label={item.label} netKobo={item.netKobo} />;
      return (
        <LedgerRow
          entry={item.entry}
          categoryName={categoryName(item.entry.categoryId)}
          onPress={openDetail}
        />
      );
    },
    [categoryName, openDetail],
  );

  const control = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refresh}
      tintColor={theme.colors.text.secondary}
      colors={[theme.colors.action.base]}
      progressBackgroundColor={theme.colors.surface.raised}
    />
  );

  const empty = items.length === 0;
  const failed = status === 'error' && empty;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text style={styles.title}>Entries</Text>
        {/* Manual entry lives here rather than in the tab bar: it is something
            you do about the ledger, not a place in the app. */}
        <Pressable
          onPress={openEntry}
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
          accessibilityRole="button"
          accessibilityLabel="Record a transaction by hand"
        >
          <Text style={styles.addGlyph}>+</Text>
        </Pressable>
      </View>

      {status === 'loading' && empty ? (
        <LoadingLedger theme={theme} />
      ) : failed ? (
        <ScrollView contentContainerStyle={styles.stateScroll} refreshControl={control}>
          <NoticeBand message={error ?? 'Could not load your transactions.'} />
          <Text style={styles.stateHint}>Pull down to try again.</Text>
        </ScrollView>
      ) : empty ? (
        <ScrollView contentContainerStyle={styles.stateScroll} refreshControl={control}>
          <Text style={styles.emptyTitle}>Nothing recorded yet</Text>
          <Text style={styles.emptyBody}>
            Entries appear here on their own as your bank emails its alerts. You can also
            record one yourself.
          </Text>
          <View style={styles.emptyAction}>
            {/* This one navigates rather than committing anything, so it never
                enters the loading state — but the prop is required so no
                screen can ship a button that silently has nothing to say
                while it works. */}
            <ActionButton
              label="Record a transaction"
              loadingLabel="Opening…"
              onPress={openEntry}
            />
          </View>
        </ScrollView>
      ) : (
        <FlashList
          data={items as LedgerItem[]}
          renderItem={renderItem}
          keyExtractor={(item) => (item.kind === 'day' ? `day-${item.key}` : `tx-${item.key}`)}
          getItemType={(item) => item.kind}
          estimatedItemSize={ESTIMATED_ROW}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={control}
          contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
          // A failure that arrives with rows already on screen is reported
          // without taking them away.
          ListHeaderComponent={
            error !== null && !empty ? (
              <View style={styles.bandWrap}>
                <NoticeBand message={error} />
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <Skeleton width="60%" height={14} borderRadius={theme.radius.sm} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

/**
 * The first load.
 *
 * Ruled blocks in the shape of the rows they are standing in for, rather than
 * a spinner: it says what is coming, and the list does not jump when the real
 * rows replace it.
 */
function LoadingLedger({ theme }: { readonly theme: AppTheme }): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.skeletonWrap} accessibilityLabel="Loading transactions">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonBody}>
            <Skeleton width={i % 2 === 0 ? '52%' : '38%'} height={15} borderRadius={theme.radius.sm} />
            <View style={styles.skeletonMeta}>
              <Skeleton width="30%" height={11} borderRadius={theme.radius.sm} />
            </View>
          </View>
          <Skeleton width={84} height={14} borderRadius={theme.radius.sm} />
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      // Transparent: the Material layer at the root owns the ground colour,
      // the atmospheric wash.
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.gutter,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.default,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text.primary,
    },
    add: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.rule.strong,
      borderRadius: theme.radius.sm,
    },
    addPressed: {
      backgroundColor: theme.colors.action.wash,
    },
    addGlyph: {
      ...theme.typography.heading,
      color: theme.colors.text.primary,
      // The glyph's own line box centres it slightly low at this size.
      marginTop: -2,
    },

    bandWrap: {
      paddingHorizontal: theme.spacing.gutter,
      paddingTop: theme.spacing.lg,
    },

    stateScroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.gutter,
      paddingBottom: theme.spacing.huge,
    },
    stateHint: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
    emptyTitle: {
      ...theme.typography.heading,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    emptyBody: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },
    emptyAction: {
      marginTop: theme.spacing.xl,
    },

    footer: {
      paddingHorizontal: theme.spacing.gutter,
      paddingVertical: theme.spacing.lg,
    },

    skeletonWrap: {
      paddingTop: theme.spacing.xl,
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.gutter,
      minHeight: 64,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.faint,
    },
    skeletonBody: {
      flex: 1,
      marginRight: theme.spacing.lg,
    },
    skeletonMeta: {
      marginTop: theme.spacing.sm,
    },
  });
}
