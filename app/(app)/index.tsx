/**
 * Dashboard — the month, at a glance.
 *
 * ── What was wrong with the last one ─────────────────────────────────────
 * It read WatermelonDB through `useLedgerSummary`, while the ledger read the
 * API. Nothing ever wrote the API's transactions into WatermelonDB — the
 * SyncEngine those files refer to was never built — so the local store was
 * permanently empty and the first screen after login reported "0 entries" and
 * "Balance not known yet" over a ledger holding twenty-two rows and a stated
 * balance. Two screens, two sources, one of them never filled.
 *
 * Both now read the API, so they cannot disagree. Local-first storage is worth
 * having and is a separate, deliberate piece of work; a dashboard silently
 * lying about someone's money while it waits is not.
 *
 * ── The screen answers four questions in order ───────────────────────────
 *   how much do I have          the balance, as the bank last stated it
 *   what happened this month    in against out, on one rule
 *   where did it go             the categories, largest first
 *   what just happened          the newest entries, same rows as the ledger
 *
 * Anything that does not answer one of those is not on the screen. The old
 * version carried a STATUS block reporting "Listening for alerts: STALE" —
 * a developer's word for a mechanism that was not running, printed as though
 * it were a reassurance.
 *
 * ── One chart, and it had to earn it ─────────────────────────────────────
 * Proportions are drawn into the hairlines the layout already has rather than
 * added as chart objects on top of it — see FlowBar and BreakdownRow. The one
 * real chart is MonthCurve, which is there because totals cannot answer the
 * question people actually open the app with: whether they are going to be
 * alright. Spent-so-far means nothing without knowing what day it is.
 */
import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { categoryPalette } from '@/design-system/tokens';
import { ActionButton, NoticeBand } from '@/design-system/components';
import { Reveal } from '@/design-system/motion/Reveal';
import { RollingNumber } from '@/design-system/motion/RollingNumber';
import { formatKoboToNaira } from '@/shared/components/AmountDisplay/AmountDisplay';
import { useUIStore } from '@/core/store/ui.store';
import { useDashboard } from '@/features/transactions/hooks/useDashboard';
import { useLedger } from '@/features/transactions/hooks/useLedger';
import { LedgerRow } from '@/features/transactions/components/LedgerRow';
import { FlowBar } from '@/features/transactions/components/FlowBar';
import { BreakdownRow } from '@/features/transactions/components/BreakdownRow';
import { MonthCurve } from '@/features/transactions/components/MonthCurve';

const MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
const DAY_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

/**
 * Capped well below the 56pt monument the type scale offers.
 *
 * A balance set at full monument scale is the loudest thing on the screen by
 * a distance, and it is also the one figure a person may not want read over
 * their shoulder on a bus. Shouting someone's net worth is a design decision,
 * not a neutral default — so the hero is the MONTH, and the balance is stated
 * clearly without dominating.
 */
const MONUMENT_MAX = 38;
/** Below this the figure stops reading as a headline; a longer number keeps
 *  its own scale rather than shrinking indefinitely. */
const MONUMENT_MIN = 26;
const CHAR_EM = 0.54;

function fitMonument(text: string, available: number): number {
  if (text.length === 0) return MONUMENT_MAX;
  const size = Math.floor(available / (text.length * CHAR_EM));
  return Math.max(MONUMENT_MIN, Math.min(MONUMENT_MAX, size));
}

/**
 * A category's colour, chosen by its id rather than its position.
 *
 * Position would mean Food is violet in a month it led and blue in a month it
 * did not, so the palette would carry no meaning at all. Hashing the id keeps
 * a category the same colour for as long as it exists.
 */
function tintFor(categoryId: string): string {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i += 1) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) | 0;
  }
  return categoryPalette[Math.abs(hash) % categoryPalette.length] ?? categoryPalette[0] ?? '#7A8599';
}

export default function DashboardScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { width } = useWindowDimensions();
  // The bar is drawn by this app, not measured by guesswork — the navigator
  // reports what it actually rendered, including the safe-area inset.
  const tabBarHeight = useBottomTabBarHeight();

  // Already in the store and persisted through MMKV — declared when the app
  // was scaffolded and never wired to anything.
  const hidden = useUIStore((state) => state.isBalanceHidden);
  const toggleVisibility = useUIStore((state) => state.toggleBalanceVisibility);

  const summary = useDashboard();
  const { categoryName } = useLedger();

  const period = useMemo(
    () => new Date().toLocaleDateString(undefined, MONTH_FORMAT).toUpperCase(),
    [],
  );

  const openEntry = useCallback(
    (id: string) => {
      Haptics.selectionAsync().catch(() => {});
      router.push(`/(app)/transactions/${id}`);
    },
    [router],
  );

  const seeAll = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/(app)/transactions');
  }, [router]);

  const toggleHidden = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    toggleVisibility();
  }, [toggleVisibility]);

  const hasMonth = summary.entryCount > 0;

  // Sized to the value, and re-sized when it grows a digit. Leading and
  // tracking scale with it: 1.20em is the floor that clears JetBrains Mono's
  // figures, and the monument's tracking is −6% of its size at any size.
  const monument = useMemo(() => {
    if (summary.balanceKobo === null) return null;
    const size = fitMonument(
      formatKoboToNaira(summary.balanceKobo),
      width - theme.spacing.gutter * 2,
    );
    return {
      fontSize: size,
      lineHeight: Math.ceil(size * 1.2),
      letterSpacing: -0.06 * size,
    };
  }, [summary.balanceKobo, width, theme.spacing.gutter]);

  // The bar stands at the figures' own cap height, so a covered balance
  // occupies exactly the space an uncovered one would and the layout never
  // shifts when it is revealed.
  const barHeight = Math.round((monument?.fontSize ?? MONUMENT_MAX) * 0.62);


  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + theme.spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={summary.refreshing}
            onRefresh={summary.refresh}
            tintColor={theme.colors.text.tertiary}
            colors={[theme.colors.action.base]}
            progressBackgroundColor={theme.colors.surface.raised}
          />
        }
      >
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <Reveal index={0}>
          <View style={[styles.masthead, { paddingTop: insets.top + theme.spacing.md }]}>
            <Text style={styles.mastheadMark}>LEDGER</Text>
            <Text style={styles.mastheadMeta}>{period}</Text>
          </View>
          <View style={styles.ruleStrong} />
        </Reveal>

        {summary.error !== null && <NoticeBand message={summary.error} />}

        {/* ── Balance ──────────────────────────────────────────────────── */}
        <Reveal index={1}>
          <Pressable
            style={styles.balanceBlock}
            onPress={summary.balanceKobo === null ? undefined : toggleHidden}
            accessibilityRole={summary.balanceKobo === null ? undefined : 'button'}
            accessibilityLabel={
              summary.balanceKobo === null
                ? undefined
                : hidden
                  ? 'Balance hidden. Tap to show.'
                  : 'Balance shown. Tap to hide.'
            }
          >
            <View style={styles.balanceCaption}>
              <Text style={styles.label}>Balance</Text>
              {summary.balanceKobo !== null && (
                <Text style={styles.balanceToggle}>{hidden ? 'Show' : 'Hide'}</Text>
              )}
            </View>
            {summary.balanceKobo === null ? (
              <>
                <Text style={styles.balanceUnknown}>Not known yet</Text>
                <Text style={styles.note}>
                  {/* "We do not know" and "you have nothing" are different
                      claims, and printing ₦0.00 for the first tells someone
                      their money is gone. */}
                  Your bank states the balance on each alert. The next one sets this.
                </Text>
              </>
            ) : hidden ? (
              // A struck-out line, not a row of bullets.
              //
              // Bullets were the first attempt and they looked broken: at
              // headline size a monospaced • is a 10pt dot on a 20pt advance,
              // so six of them read as scattered debris rather than a covered
              // figure. This is the older and better answer — the currency
              // mark, then the amount blacked out, which is what a redacted
              // document looks like and therefore unmistakably deliberate.
              //
              // Fixed width, so it never leaks the magnitude it is concealing.
              <View style={styles.redaction} accessibilityLabel="Balance hidden">
                <Text style={[styles.redactionMark, monument]}>₦</Text>
                <View style={[styles.redactionBar, { height: barHeight }]} />
              </View>
            ) : (
              <>
                <RollingNumber
                  value={summary.balanceKobo}
                  format={formatKoboToNaira}
                  style={[styles.balanceAmount, monument]}
                  accessibilityLabel={`Balance ${formatKoboToNaira(summary.balanceKobo)}`}
                />
                <Text style={styles.note}>
                  {/* A figure nobody can account for is a figure nobody
                      trusts. When this app has moved the bank’s number, it
                      says so and by how much, rather than quietly presenting
                      arithmetic as a bank statement. */}
                  {summary.adjustmentKobo === 0n
                    ? summary.accountCount === 1
                      ? 'As your bank last stated it'
                      : `Across ${summary.accountCount} accounts, as last stated`
                    : `${formatKoboToNaira(summary.balanceKobo - summary.adjustmentKobo)} from your bank, ${
                        summary.adjustmentKobo < 0n ? 'less' : 'plus'
                      } ${formatKoboToNaira(
                        summary.adjustmentKobo < 0n ? -summary.adjustmentKobo : summary.adjustmentKobo,
                      )} you added since`}
                  {summary.asOf !== null && summary.adjustmentKobo === 0n
                    ? ` · to ${summary.asOf.toLocaleDateString(undefined, DAY_FORMAT)}`
                    : ''}
                </Text>
              </>
            )}
          </Pressable>
        </Reveal>

        {!summary.ready ? (
          <Reveal index={2}>
            <Text style={styles.holding}>Reading your ledger…</Text>
          </Reveal>
        ) : !hasMonth ? (
          <Reveal index={2}>
            <EmptyMonth
              styles={styles}
              hasAccount={summary.accountCount > 0}
              onManual={() => router.push('/(app)/transactions/new')}
              onConnect={() => router.push('/(app)/connect')}
            />
          </Reveal>
        ) : (
          <>
            {/* ── This month ───────────────────────────────────────────── */}
            <Reveal index={2}>
              <SectionHead
                label="This month"
                meta={`${summary.entryCount} ${summary.entryCount === 1 ? 'entry' : 'entries'}`}
                styles={styles}
              />
              <FlowBar inKobo={summary.inKobo} outKobo={summary.outKobo} redacted={hidden} />
              <MonthCurve curve={summary.curve} redacted={hidden} />
            </Reveal>

            {/* ── Where it went ────────────────────────────────────────── */}
            {summary.breakdown.length > 0 && (
              <Reveal index={3}>
                <SectionHead label="Where it went" styles={styles} />
                {summary.breakdown.map((slice, order) => (
                  <BreakdownRow
                    key={slice.categoryId}
                    name={slice.name}
                    spentKobo={slice.spentKobo}
                    share={slice.share}
                    tint={tintFor(slice.categoryId)}
                    order={order}
                  />
                ))}
              </Reveal>
            )}

            {/* ── Recent ───────────────────────────────────────────────── */}
            <Reveal index={4}>
              <SectionHead label="Recent" action="See all" onAction={seeAll} styles={styles} />
            </Reveal>
            {summary.recent.map((entry, index) => (
              <Reveal key={entry.id} index={5 + index}>
                <LedgerRow
                  entry={entry}
                  categoryName={categoryName(entry.categoryId)}
                  onPress={openEntry}
                />
              </Reveal>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Section head ──────────────────────────────────────────────────────────

interface SectionHeadProps {
  readonly label: string;
  readonly meta?: string;
  readonly action?: string;
  readonly onAction?: () => void;
  readonly styles: ReturnType<typeof createStyles>;
}

function SectionHead({ label, meta, action, onAction, styles }: SectionHeadProps): React.JSX.Element {
  return (
    <>
      <View style={styles.sectionHead}>
        <Text style={styles.label}>{label}</Text>
        {meta !== undefined && <Text style={styles.sectionMeta}>{meta}</Text>}
        {action !== undefined && (
          <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.sectionAction}>{action}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.ruleStrong} />
    </>
  );
}

// ── Empty month ───────────────────────────────────────────────────────────

/**
 * The first-run screen, and the one a new account sits on for days.
 *
 * It answers what this is, why it is empty and what happens next — in three
 * short lines rather than a paragraph. The previous version explained the
 * mechanism at length, which is reassuring to write and tiring to read.
 *
 * ── Two different emptinesses ────────────────────────────────────────────
 * "Nothing has happened yet" and "nothing CAN happen yet" look identical on
 * screen and are completely different situations. With no account connected,
 * telling someone the ledger fills itself is a promise the app cannot keep:
 * no alert will ever arrive, and they would sit waiting on a screen that had
 * assured them waiting was the right thing to do.
 *
 * So the copy branches on whether an account exists, and the action changes
 * with it — connect first, or record by hand.
 */
function EmptyMonth({
  styles,
  hasAccount,
  onManual,
  onConnect,
}: {
  readonly styles: ReturnType<typeof createStyles>;
  readonly hasAccount: boolean;
  readonly onManual: () => void;
  readonly onConnect: () => void;
}): React.JSX.Element {
  if (!hasAccount) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Add a bank to begin.</Text>
        <Text style={styles.emptyBody}>
          Your bank already emails you when money moves. Connect that inbox and this ledger
          fills itself — there is nothing to type.
        </Text>
        {/* The app's real button, not brass text.
            
            This was a bare Pressable wrapping bodyStrong text in
            colors.action.base, and a tester could not find it. The colour was
            never the problem — brass on this ground measures 8.75:1, which
            passes WCAG AAA — it was that nothing about it was shaped like a
            control. Coloured text among other text reads as emphasis, and the
            two paragraphs above it are emphatic already.
            
            This is the single thing a new person has to do, and the ledger's
            own empty state has always used ActionButton for its equivalent.
            The dashboard was the inconsistent one. */}
        <View style={styles.emptyAction}>
          <ActionButton
            label="Connect your bank"
            loadingLabel="Opening…"
            onPress={onConnect}
            accessibilityHint="Opens Google so FinTrack can read your bank alert emails"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Nothing yet this month.</Text>
      <Text style={styles.emptyBody}>
        This ledger fills itself. When your bank sends an alert, the entry appears here on
        its own — there is nothing to set up and nothing to type.
      </Text>
      {/* Deliberately quieter than the one above, and still visibly a button.
          
          Recording by hand is the alternative here, not the instruction — the
          sentence above says the ledger fills itself, and the ledger's own
          header carries a + for this. So it gets an outline rather than a
          fill: enough edge to read as a control, not enough weight to argue
          with the message it sits under. */}
      <Pressable
        onPress={onManual}
        accessibilityRole="button"
        style={({ pressed }) => [styles.quietAction, pressed && styles.quietActionPressed]}
        hitSlop={8}
      >
        <Text style={styles.quietActionLabel}>Record one by hand</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    page: {
      flex: 1,
      // The Material layer at the root owns the ground colour.
      backgroundColor: 'transparent',
    },
    scroll: {
      paddingHorizontal: theme.spacing.gutter,
    },

    masthead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingBottom: theme.spacing.md,
    },
    mastheadMark: {
      ...theme.typography.label,
      letterSpacing: 3,
      color: theme.colors.text.primary,
    },
    mastheadMeta: {
      ...theme.typography.technicalSmall,
      letterSpacing: 1.4,
      color: theme.colors.text.tertiary,
    },

    ruleStrong: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
    },

    label: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
      flex: 1,
    },

    balanceBlock: {
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
    },
    redaction: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    redactionMark: {
      ...theme.typography.monument,
      color: theme.colors.text.secondary,
      marginRight: theme.spacing.sm,
    },
    redactionBar: {
      flex: 1,
      maxWidth: 190,
      backgroundColor: theme.colors.text.disabled,
    },
    balanceCaption: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    // Same slot and voice as CHANGE on the detail screen and SHOW on the
    // password field: an action stated as a word, at the right of a caption.
    balanceToggle: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.secondary,
    },
    balanceAmount: {
      ...theme.typography.monument,
      color: theme.colors.text.primary,
      marginTop: theme.spacing.sm,
    },
    balanceUnknown: {
      ...theme.typography.display,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.sm,
    },
    note: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.sm,
    },

    holding: {
      ...theme.typography.body,
      color: theme.colors.text.tertiary,
      paddingTop: theme.spacing.xl,
    },

    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      paddingTop: theme.spacing.xxl,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    sectionMeta: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
    },
    sectionAction: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.secondary,
    },

    empty: {
      paddingTop: theme.spacing.xxl,
    },
    emptyTitle: {
      ...theme.typography.title,
      color: theme.colors.text.primary,
    },
    emptyBody: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
    },
    emptyAction: {
      marginTop: theme.spacing.xl,
    },
    /**
     * An outlined button: a control by its edge rather than by its fill.
     *
     * The edge is brass, not a white rule. colors.rule.strong is 16% white,
     * which composites to 1.54:1 against this ground — a boundary WCAG asks to
     * be 3:1, and in practice a line you have to hunt for. Using it here would
     * have replaced one invisible control with another. Brass measures 8.75:1,
     * and a full-width border rather than a hairline gives it presence at a
     * glance.
     *
     * Same family as the filled button above, one rank down: outline instead
     * of fill is the difference, so the hierarchy is legible without either
     * one stopping being a button.
     */
    quietAction: {
      marginTop: theme.spacing.xl,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.action.base,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.lg,
    },
    quietActionPressed: {
      opacity: 0.6,
    },
    quietActionLabel: {
      ...theme.typography.bodyStrong,
      color: theme.colors.action.base,
    },
  });
}
