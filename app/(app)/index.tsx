/**
 * Dashboard — the ledger.
 *
 * ── What this replaced ───────────────────────────────────────────────────
 * The previous screen predated the design language entirely: floating cards
 * with drop shadows, a "Sync: IDLE" badge, rounded placeholder boxes, and a red
 * Sign Out button sitting in the middle of the content. It also printed a
 * hardcoded "₦0.00" under the label TOTAL BALANCE.
 *
 * That last one was the real defect. See useLedgerSummary for the full
 * argument, but briefly: "we do not know yet" and "you have nothing" are
 * different claims, and showing the second when the first is true tells a
 * person who has just signed up that their money is gone.
 *
 * ── The empty state is the first-run design, not a fallback ──────────────
 * Every new account starts here and stays here until the first bank alert
 * arrives, so this is the screen most users will see FIRST and possibly for
 * days. It is built to answer the four questions someone actually has — what is
 * this, why is it empty, what happens next, and do I need to do anything —
 * rather than apologising with an illustration.
 *
 * The status block matters more than it looks: an app whose entire mechanism is
 * invisible background listening has to prove it is listening, or "no entries"
 * is indistinguishable from "broken".
 *
 * ── Sign out ─────────────────────────────────────────────────────────────
 * Moved out of the content and set neutral. It was previously a danger-red
 * control in the main scroll, which gave the single most destructive action on
 * the screen the loudest treatment and put it where a thumb lands. Signing out
 * is not an error.
 */
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useAuthStore } from '@/core/store/auth.store';
import { useSyncStore } from '@/core/store/sync.store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Reveal } from '@/design-system/motion/Reveal';
import { RollingNumber } from '@/design-system/motion/RollingNumber';
import { formatKoboToNaira } from '@/shared/components/AmountDisplay/AmountDisplay';
import { useLedgerSummary } from '@/features/transactions/hooks/useLedgerSummary';
import type { TransactionModel } from '@/core/database/models/Transaction.model';

/** Content margin. Rules ignore it and run to the screen edge. */
const MARGIN = 20;

const MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
const DAY_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };

export default function DashboardScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const user = useAuthStore((state) => state.user);
  const syncStatus = useSyncStore((state) => state.status);
  const { logout, isLoading } = useAuth();
  const { ready, count, recent, balanceKobo, asOf } = useLedgerSummary();

  const period = useMemo(
    () => new Date().toLocaleDateString(undefined, MONTH_FORMAT).toUpperCase(),
    [],
  );

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <Reveal index={0}>
          <View style={styles.rule} />
          <View style={styles.masthead}>
            <Text style={styles.mastheadMark}>LEDGER</Text>
            <Text style={styles.mastheadMeta}>{period}</Text>
          </View>
          <View style={styles.rule} />
        </Reveal>

        {/* ── Balance, or the honest absence of one ────────────────────── */}
        <Reveal index={1}>
          <View style={styles.balanceBlock}>
            {balanceKobo === null ? (
              <>
                <Text style={styles.balanceLabel}>BALANCE</Text>
                <Text style={styles.balanceUnknown}>Not known yet</Text>
                <Text style={styles.balanceNote}>
                  Your bank states the balance on each alert. The next one sets this.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.balanceLabel}>BALANCE</Text>
                <RollingNumber
                  value={balanceKobo}
                  format={formatKoboToNaira}
                  style={styles.balanceAmount}
                  accessibilityLabel={`Balance ${formatKoboToNaira(balanceKobo)}`}
                />
                {asOf !== null && (
                  <Text style={styles.balanceNote}>
                    As stated by your bank on {asOf.toLocaleDateString(undefined, DAY_FORMAT)}
                  </Text>
                )}
              </>
            )}
          </View>
        </Reveal>

        {/* ── Entries ──────────────────────────────────────────────────── */}
        <Reveal index={2}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>ENTRIES</Text>
            <Text style={styles.sectionCount}>
              {ready ? `${count}` : '—'}
            </Text>
          </View>
          <View style={styles.ruleStrong} />
        </Reveal>

        {recent.length === 0 ? (
          <Reveal index={3}>
            <EmptyLedger ready={ready} styles={styles} />
          </Reveal>
        ) : (
          recent.map((entry, index) => (
            <Reveal key={entry.id} index={3 + index}>
              <LedgerRow entry={entry} styles={styles} />
            </Reveal>
          ))
        )}

        {/* ── Status: proof that an invisible mechanism is running ─────── */}
        <Reveal index={10}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>STATUS</Text>
          </View>
          <View style={styles.ruleStrong} />

          <StatusRow index={1} label="Listening for alerts" value={syncStatus.toUpperCase()} styles={styles} />
          <StatusRow index={2} label="Entries recorded" value={ready ? String(count) : '—'} styles={styles} />
          <StatusRow index={3} label="Signed in as" value={user?.email ?? '—'} styles={styles} />
          <View style={styles.rule} />
        </Reveal>

        <Reveal index={11}>
          <Pressable
            style={styles.signOut}
            onPress={handleLogout}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityState={{ disabled: isLoading }}
          >
            <Text style={styles.signOutLabel}>Sign out</Text>
          </Pressable>
        </Reveal>
      </ScrollView>
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────

interface EmptyProps {
  readonly ready: boolean;
  readonly styles: ReturnType<typeof createStyles>;
}

function EmptyLedger({ ready, styles }: EmptyProps): React.JSX.Element {
  // Hold rather than assert while the first query resolves — flashing "nothing
  // here" at someone who does have entries is worse than a moment of nothing.
  if (!ready) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyBody}>Reading your ledger…</Text>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No entries yet.</Text>
      <Text style={styles.emptyBody}>
        This ledger fills itself. The next alert your bank sends becomes the first line —
        there is nothing to set up and nothing to type.
      </Text>
    </View>
  );
}

// ── Rows ──────────────────────────────────────────────────────────────────

interface LedgerRowProps {
  readonly entry: TransactionModel;
  readonly styles: ReturnType<typeof createStyles>;
}

function LedgerRow({ entry, styles }: LedgerRowProps): React.JSX.Element {
  const inbound = entry.type === 'CREDIT';
  // Model stores a JS number; convert at the presentation boundary so the
  // formatter still receives exact minor units.
  const amount = formatKoboToNaira(BigInt(entry.amountKobo));

  return (
    <View style={styles.row}>
      <Text style={styles.rowDate}>
        {entry.transactionDate.toLocaleDateString(undefined, DAY_FORMAT).toUpperCase()}
      </Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowMerchant} numberOfLines={1}>
          {entry.customMerchant ?? entry.merchantName}
        </Text>
      </View>
      <Text style={[styles.rowAmount, inbound && styles.rowAmountIn]}>
        {inbound ? '+' : '−'}
        {amount}
      </Text>
    </View>
  );
}

interface StatusRowProps {
  readonly index: number;
  readonly label: string;
  readonly value: string;
  readonly styles: ReturnType<typeof createStyles>;
}

function StatusRow({ index, label, value, styles }: StatusRowProps): React.JSX.Element {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusIndex}>{String(index).padStart(2, '0')}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    page: {
      flex: 1,
      // The root Material layer owns the ground and the atmospheric wash.
      backgroundColor: 'transparent',
    },
    scroll: {
      paddingTop: theme.spacing.xxl,
      paddingBottom: theme.spacing.xxl,
    },

    // Full-bleed — the difference between a document and a stack of cards.
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.default,
    },
    ruleStrong: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
    },

    masthead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.sm,
    },
    mastheadMark: {
      ...theme.typography.micro,
      color: theme.colors.text.primary,
      letterSpacing: 3.2,
    },
    mastheadMeta: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
    },

    balanceBlock: {
      paddingHorizontal: MARGIN,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
    },
    balanceLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.6,
      marginBottom: theme.spacing.sm,
    },
    balanceAmount: {
      ...theme.typography.monument,
      color: theme.colors.text.primary,
    },
    // Set in the language face, not the number face: it is a statement about
    // knowledge, not a figure, and setting it in mono would imply a value.
    balanceUnknown: {
      ...theme.typography.title,
      color: theme.colors.text.secondary,
    },
    balanceNote: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.sm,
      maxWidth: 300,
    },

    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    sectionLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.6,
    },
    sectionCount: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
    },

    empty: {
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.xl,
    },
    emptyTitle: {
      ...theme.typography.heading,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    emptyBody: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      maxWidth: 320,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.faint,
    },
    rowDate: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
      width: 54,
    },
    rowBody: {
      flex: 1,
    },
    rowMerchant: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
    rowAmount: {
      ...theme.typography.amountRow,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.md,
    },
    // Only inbound money is coloured. A week of ordinary spending should not
    // render as a screen full of warnings.
    rowAmountIn: {
      color: theme.colors.money.inbound,
    },

    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.rule.faint,
    },
    statusIndex: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
      width: 26,
    },
    statusLabel: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      flex: 1,
    },
    statusValue: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.md,
      maxWidth: 180,
      textAlign: 'right',
    },

    // Neutral, and out of the content. Signing out is not an error.
    signOut: {
      marginTop: theme.spacing.xxl,
      marginHorizontal: MARGIN,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    signOutLabel: {
      ...theme.typography.button,
      color: theme.colors.text.tertiary,
    },
  });
}
