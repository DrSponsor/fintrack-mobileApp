/**
 * Settings — what the app holds, and how to take it back.
 *
 * ── What this replaced ───────────────────────────────────────────────────
 * A card reading "Your account settings will be displayed here." Meanwhile
 * the app had no way to remove an account, no way to see which mailbox it was
 * reading, and no way to stop it reading one — every one of those was a shell
 * command. A finance app that can only be added to is not one people trust.
 *
 * ── Ordered by what a person came here to do ─────────────────────────────
 * Accounts first, because that is what the app is about and what changes most.
 * Then the inbox it reads, because that is the mechanism and the thing people
 * most want to be able to switch off. Then preferences, then the account
 * itself. Sign out sits at the bottom, in a neutral colour — it is not an
 * error, and it should not be the loudest thing on a screen a person opened to
 * do something else.
 *
 * ── Destructive things say what they destroy ─────────────────────────────
 * Removing an account cascades to its transactions. "This cannot be undone" is
 * a phrase people click past; "this also removes 39 entries" is a decision
 * somebody can actually make. The count comes from the server rather than from
 * whatever the screen happens to have loaded.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { NoticeBand } from '@/design-system/components';
import { Reveal } from '@/design-system/motion/Reveal';
import { useUIStore } from '@/core/store/ui.store';
import { useAuthStore } from '@/core/store/auth.store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSettings } from '@/features/settings/useSettings';
import type { AccountSummary } from '@/features/capture/types';

const WHEN: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** How an account came to exist, said the way a person would say it. */
function provenance(account: AccountSummary): string {
  return account.captureMethod === 'EMAIL'
    ? 'Found in your inbox'
    : 'Added by hand';
}

export default function SettingsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const user = useAuthStore((state) => state.user);
  const hidden = useUIStore((state) => state.isBalanceHidden);
  const toggleBalance = useUIStore((state) => state.toggleBalanceVisibility);
  const { logout, isLoading: signingOut } = useAuth();

  const {
    accounts,
    connection,
    loading,
    error,
    removeAccount,
    removing,
    disconnect,
    disconnecting,
    refresh,
  } = useSettings();

  const [busyId, setBusyId] = useState<string | null>(null);

  const confirmRemove = useCallback(
    (account: AccountSummary) => {
      Haptics.selectionAsync().catch(() => {});
      const entries = account.transactionCount;
      const also =
        entries === 0
          ? 'It holds no transactions.'
          : entries === 1
            ? 'This also removes the 1 transaction recorded for it.'
            : `This also removes the ${entries} transactions recorded for it.`;

      Alert.alert(
        `Remove ${account.bankName}?`,
        `${also} Nothing is kept, and it cannot be undone.`,
        [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              setBusyId(account.id);
              void removeAccount(account.id).finally(() => setBusyId(null));
            },
          },
        ],
      );
    },
    [removeAccount],
  );

  const confirmDisconnect = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(
      'Disconnect this inbox?',
      'The app stops reading your bank alerts. Your accounts and everything already recorded stay exactly as they are.',
      [
        { text: 'Stay connected', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => void disconnect() },
      ],
    );
  }, [disconnect]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: () => {
          void logout().then(() => router.replace('/(auth)/welcome'));
        },
      },
    ]);
  }, [logout, router]);

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + theme.spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={theme.colors.text.tertiary}
          />
        }
      >
        {error !== null && (
          <View style={styles.notice}>
            <NoticeBand tone="danger" message={error} />
          </View>
        )}

        {/* ── Accounts ─────────────────────────────────────────────── */}
        <Reveal index={0}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Accounts</Text>
            <Text style={styles.sectionCount}>{accounts.length}</Text>
          </View>
          <View style={styles.rule} />

          {accounts.length === 0 && (
            <Text style={styles.empty}>
              No accounts yet. Connect an inbox and the app will find them for you.
            </Text>
          )}

          {accounts.map((account) => (
            <View key={account.id}>
              <View style={styles.row}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {account.bankName}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {account.accountLast4 !== null && account.accountLast4 !== ''
                      ? `···· ${account.accountLast4}`
                      : ''}
                  </Text>
                  <Text style={styles.rowNote}>
                    {provenance(account)}
                    {account.transactionCount > 0 ? ` · ${account.transactionCount} entries` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => confirmRemove(account)}
                  disabled={removing && busyId === account.id}
                  style={styles.action}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${account.bankName}`}
                >
                  <Text style={styles.actionDanger}>
                    {removing && busyId === account.id ? 'Removing' : 'Remove'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.ruleFaint} />
            </View>
          ))}

          <Link href="/(app)/connect" asChild>
            <Pressable style={styles.addRow} accessibilityRole="button">
              <View style={styles.addTick} />
              <Text style={styles.addLabel}>Add an account</Text>
            </Pressable>
          </Link>
        </Reveal>

        {/* ── The inbox it reads ───────────────────────────────────── */}
        <Reveal index={1}>
          <View style={[styles.sectionHead, styles.sectionSpaced]}>
            <Text style={styles.sectionLabel}>Inbox</Text>
          </View>
          <View style={styles.rule} />

          {connection?.connected === true ? (
            <>
              <View style={styles.row}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {connection.emailAddress ?? 'Connected'}
                  </Text>
                  <Text style={styles.rowNote}>
                    {connection.connectedAt !== null
                      ? `Connected ${new Date(connection.connectedAt).toLocaleDateString(undefined, WHEN)}`
                      : 'Connected'}
                  </Text>
                </View>
                <Pressable
                  onPress={confirmDisconnect}
                  disabled={disconnecting}
                  style={styles.action}
                  accessibilityRole="button"
                  accessibilityLabel="Disconnect this inbox"
                >
                  <Text style={styles.actionDanger}>
                    {disconnecting ? 'Disconnecting' : 'Disconnect'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.ruleFaint} />
              <Text style={styles.sectionNote}>
                The app reads bank alerts here and nothing else. It never sees your banking
                password and cannot move your money.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.empty}>No inbox connected.</Text>
              <Link href="/(app)/connect" asChild>
                <Pressable style={styles.addRow} accessibilityRole="button">
                  <View style={styles.addTick} />
                  <Text style={styles.addLabel}>Connect an inbox</Text>
                </Pressable>
              </Link>
            </>
          )}
        </Reveal>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <Reveal index={2}>
          <View style={[styles.sectionHead, styles.sectionSpaced]}>
            <Text style={styles.sectionLabel}>Preferences</Text>
          </View>
          <View style={styles.rule} />

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              toggleBalance();
            }}
            style={styles.row}
            accessibilityRole="switch"
            accessibilityState={{ checked: hidden }}
            accessibilityLabel="Keep the balance covered"
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Keep the balance covered</Text>
              <Text style={styles.rowNote}>
                Hides the figure on the dashboard until you tap it.
              </Text>
            </View>
            <Text style={styles.actionNeutral}>{hidden ? 'On' : 'Off'}</Text>
          </Pressable>
          <View style={styles.ruleFaint} />
        </Reveal>

        {/* ── This account ─────────────────────────────────────────── */}
        <Reveal index={3}>
          <View style={[styles.sectionHead, styles.sectionSpaced]}>
            <Text style={styles.sectionLabel}>You</Text>
          </View>
          <View style={styles.rule} />

          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowCredential} numberOfLines={1}>
                {user?.email ?? '—'}
              </Text>
            </View>
          </View>
          <View style={styles.ruleFaint} />

          {/* Neutral, and last. Signing out is not an error, and it was
              previously a danger-red button in the middle of the content. */}
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            style={styles.row}
            accessibilityRole="button"
          >
            <Text style={styles.signOut}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
          <View style={styles.ruleFaint} />
        </Reveal>

        {/* Development only. The route stays registered in production so it
            always resolves, but nothing links to it there. */}
        {__DEV__ && (
          <Link href="/(app)/capture-debug" asChild>
            <Pressable style={styles.devRow} accessibilityRole="button">
              <Text style={styles.devLabel}>DEV</Text>
              <Text style={styles.devText}>Alert capture inspector</Text>
              <Text style={styles.devChevron}>→</Text>
            </Pressable>
          </Link>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: theme.colors.surface.base,
    },
    header: {
      paddingHorizontal: theme.spacing.gutter,
      paddingBottom: theme.spacing.md,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text.primary,
    },
    scroll: {
      paddingHorizontal: theme.spacing.gutter,
    },
    notice: {
      paddingBottom: theme.spacing.lg,
    },

    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingBottom: theme.spacing.sm,
    },
    sectionSpaced: {
      paddingTop: theme.spacing.xxl,
    },
    sectionLabel: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
    },
    sectionCount: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
    },
    sectionNote: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      paddingTop: theme.spacing.md,
    },

    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
    },
    ruleFaint: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.faint,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
      minHeight: 56,
    },
    rowBody: {
      flex: 1,
    },
    rowTitle: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
    },
    rowMeta: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    rowNote: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
    rowCredential: {
      ...theme.typography.credential,
      color: theme.colors.text.primary,
    },

    action: {
      paddingVertical: theme.spacing.xs,
    },
    actionDanger: {
      ...theme.typography.micro,
      letterSpacing: 1.1,
      color: theme.colors.state.danger,
    },
    actionNeutral: {
      ...theme.typography.micro,
      letterSpacing: 1.1,
      color: theme.colors.text.secondary,
    },

    empty: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      paddingVertical: theme.spacing.lg,
    },

    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      minHeight: 52,
    },
    // The same 2px mark that means "this one" everywhere else in the app.
    addTick: {
      width: 2,
      height: 16,
      backgroundColor: theme.colors.action.base,
      marginRight: theme.spacing.md,
    },
    addLabel: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
    },

    signOut: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },

    devRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
      marginTop: theme.spacing.xxl,
    },
    devLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.disabled,
    },
    devText: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      flex: 1,
    },
    devChevron: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
    },
  });
}
