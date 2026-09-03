/**
 * Settings — where somebody checks the app is real and undoes something.
 *
 * ── What this replaced ───────────────────────────────────────────────────
 * A card reading "Your account settings will be displayed here." Every tab a
 * person taps to reassure themselves led to a sentence admitting nothing was
 * built, on the one screen whose job is to demonstrate the opposite.
 *
 * ── Ruled sections, not cards ────────────────────────────────────────────
 * The obvious build is a stack of rounded cards with chevrons, which is the
 * single most reproduced screen in software. This is the ledger the rest of
 * the app is: a caption, entries on hairlines, a value on the right. Settings
 * is a document listing what is true about this account, so it is set as one.
 *
 * ── The destructive things are quiet ─────────────────────────────────────
 * Disconnecting and signing out sit at the bottom, in text, with no filled
 * button anywhere near a thumb's resting position. The previous dashboard put
 * a danger-red Sign Out in the middle of the content, which gave the most
 * destructive action on the screen the loudest treatment. Neither of these is
 * an error and neither should look like one.
 *
 * ── Nothing claims more than it knows ────────────────────────────────────
 * An account shows the holder the bank addresses, falling back to how the app
 * came to believe it is yours — confirmed from an alert, or simply typed. A
 * tick would claim a verification nobody performed, and the holder is the
 * fact that actually settles it: a scan of a shared or forwarded inbox can
 * offer somebody else's account, and a name is how a person spots that.
 *
 * ── Removing an account is destructive and says so ───────────────────────
 * It cascades to every transaction on that account. The confirmation states
 * that outright, because a dialogue that only asks "are you sure" tells the
 * user nothing they did not already know when they pressed.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { NoticeBand } from '@/design-system/components';
import { Reveal } from '@/design-system/motion/Reveal';
import { useAuthStore } from '@/core/store/auth.store';
import { useUIStore } from '@/core/store/ui.store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSettings, type SettingsAccount } from '@/features/settings/useSettings';
import { formatAccountMask } from '@/shared/format/accountMask';

const JOINED_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** How the app came to believe an account is the user's, in words rather than
 *  in a badge. A tick would claim verification the app has not performed. */
function provenance(account: SettingsAccount): string {
  if (account.verificationSource === 'EMAIL_DISCOVERY') return 'Confirmed from a bank alert';
  return 'Added by you';
}

/**
 * What to print on the right of an account row.
 *
 * The mask first, because it is the bank's own statement. And the last-four
 * check is on emptiness, not on null: a discovered account carries an EMPTY
 * accountLast4 — Access reveals three digits and padding them to four would
 * invent one — so a null check alone renders "···· " with nothing after it,
 * on exactly the accounts discovery creates.
 */
function identify(account: SettingsAccount): string {
  if (account.accountMask !== null && account.accountMask.length > 0) {
    return formatAccountMask(account.accountMask);
  }
  const last4 = account.accountLast4;
  return last4 !== null && last4.length > 0 ? `···· ${last4}` : '';
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
  const { logout } = useAuth();

  const {
    accounts,
    accountsLoading,
    inbox,
    removeAccount,
    disconnect,
    disconnecting,
    error,
    refresh,
  } = useSettings();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  const go = useCallback(
    (path: string) => {
      Haptics.selectionAsync().catch(() => {});
      router.push(path as never);
    },
    [router],
  );

  // The consequence is stated because it is neither obvious nor recoverable:
  // removing an account cascades to every transaction recorded on it. A
  // confirmation that only asks ‘are you sure’ tells the user nothing they did
  // not already know when they pressed.
  const askRemove = useCallback(
    (account: SettingsAccount) => {
      const held =
        account.holderName !== null
          ? `\n\nThis account is in the name of ${account.holderName}.`
          : '';

      Alert.alert(
        account.bankName,
        `${identify(account)}
${provenance(account)}${held}

Removing it also removes every transaction recorded on it, and that cannot be undone.`,
        [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              Haptics.selectionAsync().catch(() => {});
              void removeAccount(account.id).catch(() => {
                // Surfaced by the hook’s error, which the band above renders.
              });
            },
          },
        ],
      );
    },
    [removeAccount],
  );

  // Confirmed, because it stops new transactions arriving and the person
  // asking is usually one tap from somewhere else.
  const askDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect this inbox?',
      'New alerts will stop arriving. Everything already recorded stays exactly as it is.',
      [
        { text: 'Keep it connected', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            void disconnect().catch(() => {
              // Surfaced by the hook's error, which the band above already renders.
            });
          },
        },
      ],
    );
  }, [disconnect]);

  const askSignOut = useCallback(() => {
    Alert.alert('Sign out?', 'Your accounts and transactions stay on this device’s server.', [
      { text: 'Stay signed in', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void logout().then(() => router.replace('/(auth)/welcome'));
        },
      },
    ]);
  }, [logout, router]);

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + theme.spacing.lg, paddingBottom: tabBarHeight + theme.spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.text.tertiary}
          />
        }
      >
        <Reveal index={0}>
          <Text style={styles.title}>Settings</Text>
        </Reveal>

        {error !== null && (
          <View style={styles.notice}>
            <NoticeBand tone="danger" message={error} />
          </View>
        )}

        {/* ── Accounts ──────────────────────────────────────────────── */}
        <Reveal index={1}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Accounts</Text>
            <Text style={styles.sectionCount}>{accountsLoading ? '—' : String(accounts.length)}</Text>
          </View>
          <View style={styles.ruleStrong} />
        </Reveal>

        {accounts.map((account, index) => (
          <Reveal key={account.id} index={index + 2}>
            <Pressable
              style={styles.row}
              onPress={() => askRemove(account)}
              accessibilityRole="button"
              accessibilityLabel={`${account.bankName}, ${identify(account)}. ${provenance(account)}. Opens options.`}
            >
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {account.bankName}
                </Text>
                <Text style={styles.rowNote}>
                  {account.holderName ?? provenance(account)}
                </Text>
              </View>
              <Text style={styles.rowValue}>{identify(account)}</Text>
            </Pressable>
            <View style={styles.rule} />
          </Reveal>
        ))}

        {accounts.length > 0 && (
          <Reveal index={accounts.length + 2}>
            <Text style={styles.hint}>Tap an account to see it or remove it.</Text>
          </Reveal>
        )}

        {!accountsLoading && accounts.length === 0 && (
          <Reveal index={2}>
            <Text style={styles.empty}>No accounts yet.</Text>
          </Reveal>
        )}

        <Reveal index={accounts.length + 3}>
          <Pressable style={styles.action} onPress={() => go('/(app)/connect')}>
            <Text style={styles.actionLabel}>Add an account</Text>
          </Pressable>
          <View style={styles.rule} />
        </Reveal>

        {/* ── Inbox ─────────────────────────────────────────────────── */}
        <Reveal index={accounts.length + 3}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Inbox</Text>
          </View>
          <View style={styles.ruleStrong} />

          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>
                {inbox?.connected === true ? 'Connected' : 'Not connected'}
              </Text>
              <Text style={styles.rowNote}>
                {inbox?.connected === true
                  ? 'Alerts from this mailbox become entries automatically.'
                  : 'Connect an inbox and this ledger fills itself.'}
              </Text>
            </View>
          </View>

          {/* The address, in the identifier face. It is something a person
              CHECKS rather than reads, and they may have authorised a mailbox
              other than the one they signed up with. */}
          {inbox?.emailAddress != null && (
            <>
              <View style={styles.rule} />
              <View style={styles.row}>
                <Text style={styles.rowTitle}>Mailbox</Text>
                <Text style={styles.rowMono} numberOfLines={1}>
                  {inbox.emailAddress}
                </Text>
              </View>
            </>
          )}
          <View style={styles.rule} />
        </Reveal>

        {/* ── Privacy ───────────────────────────────────────────────── */}
        <Reveal index={accounts.length + 4}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Privacy</Text>
          </View>
          <View style={styles.ruleStrong} />

          <Pressable
            style={styles.row}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              toggleBalance();
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: hidden }}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Hide my balance</Text>
              <Text style={styles.rowNote}>
                Covered until you tap to reveal it.
              </Text>
            </View>
            <Text style={[styles.rowValue, hidden && styles.rowValueOn]}>
              {hidden ? 'On' : 'Off'}
            </Text>
          </Pressable>
          <View style={styles.rule} />
        </Reveal>

        {/* ── Account ───────────────────────────────────────────────── */}
        <Reveal index={accounts.length + 5}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>You</Text>
          </View>
          <View style={styles.ruleStrong} />

          <View style={styles.row}>
            <Text style={styles.rowTitle}>Signed in as</Text>
            <Text style={styles.rowMono} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
          <View style={styles.rule} />

          {user?.createdAt != null && (
            <>
              <View style={styles.row}>
                <Text style={styles.rowTitle}>Joined</Text>
                <Text style={styles.rowValue}>
                  {new Date(user.createdAt).toLocaleDateString(undefined, JOINED_FORMAT)}
                </Text>
              </View>
              <View style={styles.rule} />
            </>
          )}
        </Reveal>

        {/* ── The quiet end ─────────────────────────────────────────── */}
        <Reveal index={accounts.length + 6}>
          <View style={styles.tail}>
            {inbox?.connected === true && (
              <Pressable onPress={askDisconnect} disabled={disconnecting}>
                <Text style={[styles.quiet, disconnecting && styles.quietBusy]}>
                  {disconnecting ? 'Disconnecting…' : 'Disconnect this inbox'}
                </Text>
              </Pressable>
            )}
            <Pressable onPress={askSignOut}>
              <Text style={styles.quiet}>Sign out</Text>
            </Pressable>

            {/* Development only. The route stays registered in production so it
                always resolves, but nothing links to it there. This is the only
                way in — delete both together once the parser has a real
                corpus. */}
            {__DEV__ && (
              <Pressable onPress={() => go('/(app)/capture-debug')}>
                <Text style={styles.dev}>DEV · Alert capture inspector</Text>
              </Pressable>
            )}
          </View>
        </Reveal>
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
    scroll: {
      paddingHorizontal: theme.spacing.gutter,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xl,
    },
    notice: {
      marginBottom: theme.spacing.lg,
    },

    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.sm,
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

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.lg,
      minHeight: 56,
      paddingVertical: theme.spacing.md,
    },
    rowBody: {
      flex: 1,
    },
    rowTitle: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
    },
    rowNote: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
    rowValue: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    rowValueOn: {
      color: theme.colors.text.primary,
    },
    // Addresses and account numbers are checked character by character, not
    // read — the same reason the auth fields are set this way.
    rowMono: {
      ...theme.typography.technical,
      color: theme.colors.text.secondary,
      flexShrink: 1,
    },

    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.faint,
    },
    ruleStrong: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
    },

    hint: {
      ...theme.typography.caption,
      color: theme.colors.text.disabled,
      paddingTop: theme.spacing.md,
    },
    empty: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      paddingVertical: theme.spacing.lg,
    },

    action: {
      minHeight: 56,
      justifyContent: 'center',
    },
    actionLabel: {
      ...theme.typography.body,
      color: theme.colors.action.base,
    },

    tail: {
      marginTop: theme.spacing.xxl,
      gap: theme.spacing.lg,
    },
    // No filled button, no danger red. Signing out is not an error, and the
    // loudest control on a screen should not be the one that undoes things.
    quiet: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    dev: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
    },
    quietBusy: {
      color: theme.colors.text.tertiary,
    },
  });
}
