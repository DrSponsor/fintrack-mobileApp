/**
 * WhenField — when the payment happened.
 *
 * ── Why this matters more than it looks ──────────────────────────────────
 * This is not only the ledger's sort key. It is the field the server matches on
 * when deciding whether an incoming bank alert describes the same money as this
 * entry. A time that is roughly right lets the two be paired and collapsed into
 * one row; a time that is a day out leaves the user with the same payment
 * recorded twice. The default is therefore NOW, because the overwhelmingly
 * common case is someone recording a payment they just made, and a correct
 * default is worth more than any control.
 *
 * ── Why relative shortcuts instead of a calendar ─────────────────────────
 * People do not remember "14:07 on the 22nd". They remember "just now", "this
 * morning", "yesterday". Those are the shortcuts, and they resolve to a real
 * timestamp shown in full underneath, so nothing is hidden behind a label.
 *
 * The day stepper covers a few days back. Beyond that, and for any time of day
 * the shortcuts do not name, tapping the resolved line opens WhenSheet and the
 * moment is typed exactly.
 *
 * That reading was wrong when it was written here: it treated back-dating as
 * the rare case and missed that time of day was unreachable at ANY distance —
 * a payment made at 14:07 could be filed at 9am or noon and no nearer. The fix
 * is not a native date picker, which cannot be added without rebuilding the
 * dev client; it is a typed field with a line stating what was understood,
 * which is the same device the amount field already relies on.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { WhenSheet } from './WhenSheet';

export interface WhenFieldProps {
  /** 1-based position on the form rail, rendered zero-padded. Matches RuledField. See ChoiceRow for why partial
   *  numbering is worse than none. */
  readonly index?: number;
  readonly value: Date;
  readonly onChange: (next: Date) => void;
  readonly error?: string | undefined;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type Shortcut = {
  readonly label: string;
  readonly resolve: () => Date;
};

const SHORTCUTS: readonly Shortcut[] = [
  { label: 'Now', resolve: () => new Date() },
  { label: '1 hr ago', resolve: () => new Date(Date.now() - HOUR_MS) },
  { label: 'This morning', resolve: () => atHour(new Date(), 9) },
  { label: 'Yesterday', resolve: () => atHour(new Date(Date.now() - DAY_MS), 12) },
];

function atHour(day: Date, hour: number): Date {
  const next = new Date(day);
  next.setHours(hour, 0, 0, 0);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** "Today at 2:32 pm", "Yesterday at 12:00 pm", "Sat 22 Aug at 9:00 am". */
export function describeWhen(value: Date, now: Date = new Date()): string {
  const time = value
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();

  if (isSameDay(value, now)) return `Today at ${time}`;
  if (isSameDay(value, new Date(now.getTime() - DAY_MS))) return `Yesterday at ${time}`;

  const day = value.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(value.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
  return `${day} at ${time}`;
}

export function WhenField({ value, onChange, error, index }: WhenFieldProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * The clock, read once at mount and refreshed on every interaction rather
   * than during render.
   *
   * Reading it while rendering would be impure — the same props could produce a
   * different tree on a re-render nobody asked for. Refreshing it on
   * interaction is not a workaround either: the only precision this control
   * needs is which side of a day boundary "now" falls on, and the user cannot
   * change the value without going through one of these handlers.
   */
  const [now, setNow] = useState(() => Date.now());

  const shiftDays = (days: number): void => {
    const current = Date.now();
    setNow(current);

    const next = new Date(value.getTime() + days * DAY_MS);
    // Forward stepping stops at now. A future timestamp is always a mistake,
    // and the server rejects it, so the control simply cannot produce one.
    if (next.getTime() > current) return;
    void Haptics.selectionAsync();
    onChange(next);
  };

  const canGoForward = value.getTime() + DAY_MS <= now;

  return (
    <View style={styles.block}>
      <View style={styles.captionRow}>
        {index !== undefined && (
            <Text style={styles.index}>{String(index).padStart(2, '0')}</Text>
          )}
        <Text style={styles.caption}>When</Text>
      </View>

      <View style={styles.resolvedRow}>
        {/* The resolved line is the way in to an exact time. Tapping what the
            field already says is a more findable affordance than a separate
            control, and it is the thing a person is looking at when they
            notice it is wrong. */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setEditing(true);
          }}
          style={styles.resolvedTap}
          accessibilityRole="button"
          accessibilityLabel={`${describeWhen(value, new Date(now))}. Tap to set an exact date and time.`}
        >
          <Text style={styles.resolved} accessibilityLiveRegion="polite">
            {describeWhen(value, new Date(now))}
          </Text>
          <Text style={styles.editHint}></Text>
        </Pressable>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => shiftDays(-1)}
            style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}
            accessibilityRole="button"
            accessibilityLabel="One day earlier"
          >
            <Text style={styles.stepGlyph}>−</Text>
          </Pressable>
          <Pressable
            onPress={() => shiftDays(1)}
            disabled={!canGoForward}
            style={({ pressed }) => [
              styles.step,
              pressed && styles.stepPressed,
              !canGoForward && styles.stepDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="One day later"
            accessibilityState={{ disabled: !canGoForward }}
          >
            <Text style={styles.stepGlyph}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.rule, error !== undefined && styles.ruleError]} />

      <View style={styles.chips}>
        {SHORTCUTS.map((shortcut) => (
          <Pressable
            key={shortcut.label}
            onPress={() => {
              void Haptics.selectionAsync();
              setNow(Date.now());
              onChange(shortcut.resolve());
            }}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.chipLabel}>{shortcut.label}</Text>
          </Pressable>
        ))}
      </View>

      {error !== undefined && <Text style={styles.error}>{error}</Text>}

      <WhenSheet
        visible={editing}
        value={value}
        onCancel={() => setEditing(false)}
        onConfirm={(next) => {
          setEditing(false);
          onChange(next);
        }}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    block: {
      paddingTop: theme.spacing.lg,
    },
    captionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    index: {
      ...theme.typography.technicalSmall,
      width: 26,
      color: theme.colors.text.disabled,
    },
    caption: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
    },
    resolvedTap: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flex: 1,
      gap: theme.spacing.sm,
    },
    // Stated as a word rather than an icon, like CHANGE and SHOW elsewhere.
    editHint: {
      ...theme.typography.micro,
      letterSpacing: 1.2,
      color: theme.colors.text.tertiary,
    },
    resolvedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.xs,
      minHeight: 34,
    },
    resolved: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
      flex: 1,
    },
    stepper: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    step: {
      width: 44,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.rule.strong,
      borderRadius: theme.radius.sm,
    },
    stepPressed: {
      backgroundColor: theme.colors.action.wash,
    },
    stepDisabled: {
      opacity: 0.35,
    },
    stepGlyph: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.strong,
      marginTop: theme.spacing.sm,
    },
    ruleError: {
      backgroundColor: theme.colors.state.danger,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    chip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.rule.default,
      borderRadius: theme.radius.sm,
      minHeight: 36,
      justifyContent: 'center',
    },
    chipPressed: {
      backgroundColor: theme.colors.action.wash,
    },
    chipLabel: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.state.danger,
      marginTop: theme.spacing.xs,
    },
  });
}
