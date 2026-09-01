/**
 * Connect an inbox, then confirm the accounts found in it.
 *
 * ── Why this screen exists ───────────────────────────────────────────────
 * Until now there was no way to add a bank account from inside the app at
 * all. Accounts were created over curl and Gmail was connected with a shell
 * script, so the app was usable by exactly one person. A new user reached the
 * dashboard, tried to record a transaction, was told "add an account first",
 * and found nothing to tap.
 *
 * ── Confirming, not typing ───────────────────────────────────────────────
 * The obvious version of this screen is a form: bank name, last four digits,
 * account type. Nothing verifies any of it, a typo produces an account that
 * silently receives nothing, and the person least able to spot the mistake is
 * the one making it.
 *
 * So the app reads the alerts already sitting in the inbox and shows what the
 * BANK printed — its name for itself, its own masked account number, the
 * holder it addresses. The user's job is recognition rather than recall, which
 * is the easier task and the one less likely to go wrong.
 *
 * ── Nothing is selected by default ───────────────────────────────────────
 * A scan of a shared or forwarded inbox can surface someone else's account.
 * Pre-ticking every row would make the safe path require noticing, and the
 * careless path the default. Each row is an explicit act.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { ActionButton, NoticeBand } from '@/design-system/components';
import { Reveal } from '@/design-system/motion/Reveal';
import {
  useGmailConnect,
  type AccountType,
  type DiscoveredAccount,
} from '@/features/onboarding/connect/useGmailConnect';

/** Default for a confirmed account. Savings is the commonest personal account
 *  in this market, and the type is adjustable afterwards. */
const DEFAULT_TYPE: AccountType = 'SAVINGS';

function keyOf(account: DiscoveredAccount): string {
  return `${account.bankName}::${account.accountMask}`;
}

export default function ConnectScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { phase, error, connect, discovered, discovering, confirm, confirming } = useGmailConnect();
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  const toggle = useCallback((account: DiscoveredAccount) => {
    Haptics.selectionAsync().catch(() => {});
    setPicked((current) => {
      const next = new Set(current);
      const key = keyOf(account);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    const chosen = discovered
      .filter((account) => picked.has(keyOf(account)))
      .map((account) => ({ ...account, accountType: DEFAULT_TYPE }));
    if (chosen.length === 0) return;

    try {
      await confirm(chosen);
      router.replace('/(app)');
    } catch {
      // The hook has already put the reason on screen; staying put lets the
      // user retry without losing what they ticked.
    }
  }, [confirm, discovered, picked, router]);

  const busy = phase === 'authorising' || phase === 'scanning' || discovering;

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
        <Text style={styles.title}>Add your accounts</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {error !== null && (
          <View style={styles.notice}>
            <NoticeBand tone="danger" message={error} />
          </View>
        )}

        {phase !== 'done' && (
          <Reveal index={0}>
            <Text style={styles.lede}>
              Your bank already emails you when money moves. Connect that inbox and this app
              reads those alerts — nothing else.
            </Text>
            <Text style={styles.note}>
              It never sees your banking password and cannot move your money.
            </Text>
            <View style={styles.commit}>
              <ActionButton
                label={busy ? 'Waiting for Google…' : 'Connect Gmail'}
                loading={busy}
                loadingLabel={phase === 'scanning' ? 'Reading your alerts…' : 'Waiting for Google…'}
                onPress={() => void connect()}
              />
            </View>
          </Reveal>
        )}

        {phase === 'done' && discovered.length === 0 && (
          <Reveal index={0}>
            <Text style={styles.lede}>No bank accounts found in that inbox yet.</Text>
            <Text style={styles.note}>
              This is normal if your bank does not email alerts, or if none have arrived in the
              last few months. You can still record transactions by hand.
            </Text>
          </Reveal>
        )}

        {discovered.length > 0 && (
          <>
            <Reveal index={0}>
              <Text style={styles.lede}>
                {discovered.length === 1
                  ? 'Found one account in your inbox.'
                  : `Found ${discovered.length} accounts in your inbox.`}
              </Text>
              <Text style={styles.note}>
                Tick the ones that are yours. Anything you leave unticked is forgotten.
              </Text>
            </Reveal>

            <View style={styles.list}>
              {discovered.map((account, index) => {
                const key = keyOf(account);
                const on = picked.has(key);
                return (
                  <Reveal key={key} index={index + 1}>
                    <Pressable
                      onPress={() => toggle(account)}
                      style={styles.row}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${account.bankName}, account ending ${account.accountMask}`}
                    >
                      {/* Same 2px tick that marks a live field and a chosen
                          picker row, so "this one" is stated identically
                          everywhere in the app. */}
                      <View style={[styles.tick, on && styles.tickOn]} />
                      <View style={styles.rowBody}>
                        <Text style={[styles.bank, on && styles.bankOn]} numberOfLines={1}>
                          {account.bankName}
                        </Text>
                        <Text style={styles.mask}>{account.accountMask}</Text>
                        {account.holderName !== null && (
                          <Text style={styles.holder} numberOfLines={1}>
                            {account.holderName}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                    <View style={styles.rule} />
                  </Reveal>
                );
              })}
            </View>

            <Text style={styles.footnote}>
              Seeing an account that is not yours? Leave it unticked — it is never saved.
            </Text>

            <View style={styles.commit}>
              <ActionButton
                label={
                  picked.size === 0
                    ? 'Select an account'
                    : picked.size === 1
                      ? 'Add this account'
                      : `Add these ${picked.size} accounts`
                }
                disabled={picked.size === 0}
                loading={confirming}
                loadingLabel="Adding…"
                onPress={() => void save()}
              />
            </View>
          </>
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
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.default,
    },
    close: {
      width: 44,
      height: 44,
      marginLeft: -theme.spacing.xs,
      justifyContent: 'center',
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
      paddingTop: theme.spacing.xl,
    },
    notice: {
      marginBottom: theme.spacing.lg,
    },
    lede: {
      ...theme.typography.heading,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    note: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    list: {
      marginTop: theme.spacing.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      minHeight: 64,
    },
    tick: {
      width: 2,
      height: 34,
      marginRight: theme.spacing.md,
      backgroundColor: theme.colors.rule.strong,
    },
    tickOn: {
      backgroundColor: theme.colors.action.base,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    bank: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.secondary,
    },
    bankOn: {
      color: theme.colors.text.primary,
    },
    // The account number in the number face. It is an identifier a person
    // checks digit by digit, not language they read.
    mask: {
      ...theme.typography.technical,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.hair,
    },
    holder: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.hair,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.faint,
    },
    footnote: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.lg,
    },
    commit: {
      marginTop: theme.spacing.xl,
    },
  });
}
