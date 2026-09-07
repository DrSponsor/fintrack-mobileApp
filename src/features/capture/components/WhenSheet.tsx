/**
 * Setting an exact date and time.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * WhenField offers Now, an hour ago, this morning, yesterday, and a stepper
 * that moves a day per tap. That covers recording something you just did, and
 * nothing else. Any other time of day was simply unreachable — a payment made
 * at 14:07 could be filed at 9am or noon and no closer — and back-dating two
 * weeks was fourteen taps.
 *
 * ── Why typed, and not a wheel or a calendar ─────────────────────────────
 * A native picker is the obvious answer and it is a native module: it cannot
 * be added without rebuilding the dev client, so it could not be used or even
 * tested today. A hand-rolled wheel is a week of work to get right and is
 * usually got wrong.
 *
 * Typing is faster than either for someone who knows the answer, which is the
 * only person who opens this — four digits beats spinning a drum. Separators
 * are inserted as you type, so the numeric keypad is enough and no key that is
 * not on it is ever needed. See maskTime and maskDate.
 *
 * ── What makes typed input safe here ─────────────────────────────────────
 * The same device the amount field uses: the input shows what was typed, and
 * a line beneath states what the app UNDERSTOOD, in full. "22/08" and "14:07"
 * are ambiguous on their own; "Saturday, 22 August 2026 at 2:07 pm" is not,
 * and it is impossible to confirm the wrong moment without seeing it written
 * out first.
 *
 * That is also why the field is refused rather than corrected when it does not
 * parse. Guessing what someone meant by "31/02" and silently filing it as
 * 3 March is the kind of help that loses trust.
 */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { ActionButton, RuledField } from '@/design-system/components';

export interface WhenSheetProps {
  readonly visible: boolean;
  /** What the field currently holds. The sheet opens on this. */
  readonly value: Date;
  readonly onCancel: () => void;
  readonly onConfirm: (next: Date) => void;
}

/** Longest a transaction may be back-dated. Two years covers any statement
 *  anyone would reconstruct by hand; beyond it a typo is likelier than a
 *  memory. */
const MAX_AGE_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const FULL: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

/**
 * Separators appear as you type, so only digits are ever pressed.
 *
 * The numeric keypad has no colon and no slash — which made the first version
 * of this sheet literally impossible to fill in. Switching to a full keyboard
 * would fix that and make every entry slower, on a field where every character
 * is a digit.
 *
 * Masking a controlled input is normally a caret trap: inserting a character
 * mid-string moves everything after it, and editing anywhere but the end lands
 * the cursor in the wrong place. It is safe HERE, and only here, because these
 * fields are four and eight digits long and are typed straight through. The
 * amount field, which is none of those things, still refuses to reformat and
 * shows a confirmation line instead.
 *
 * Backspacing works without a special case: the digits are re-derived from
 * whatever remains, so deleting through a separator simply removes it.
 */
export function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Which half of the day. */
export type Meridiem = 'am' | 'pm';

/**
 * 12-hour input, 24-hour meaning.
 *
 * ── Why the field is not 24-hour any more ────────────────────────────────
 * It was, and it was labelled "Time · 24-hour" while the confirmation line
 * beneath it read the moment back through `toLocaleTimeString`, which follows
 * the device locale and on most phones says "2:07 PM". So the field asked for
 * one clock and answered in another.
 *
 * People also think in 12-hour here, and the failure mode of asking them not
 * to is quiet: someone meaning two in the afternoon types 2:00, and a payment
 * is filed twelve hours from where it happened. Nothing about the row looks
 * wrong afterwards.
 *
 * ── Why am/pm is seeded rather than defaulted ────────────────────────────
 * A control that always starts on am just moves the same twelve-hour error
 * somewhere less visible — from a mistyped hour to an unread toggle. It opens
 * on whichever half the existing value falls in, so the common case (recording
 * something that just happened) is already correct before anyone touches it.
 *
 * Midnight and noon are the two that trip every implementation: 12 am is hour
 * 0, 12 pm is hour 12, and neither is "add twelve".
 */
export function toTwentyFourHour(hour12: number, meridiem: Meridiem): number {
  const wrapped = hour12 % 12; // 12 → 0, which is what both branches need.
  return meridiem === 'am' ? wrapped : wrapped + 12;
}

/** The half of the day a moment falls in, for seeding the control. */
export function meridiemOf(at: Date): Meridiem {
  return at.getHours() < 12 ? 'am' : 'pm';
}

/** A moment's hour on a 12-hour clock, for seeding the field. */
export function twelveHourOf(at: Date): number {
  const hour = at.getHours() % 12;
  return hour === 0 ? 12 : hour;
}

export function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Reads "DD/MM/YYYY" and "HH:MM" into a moment, or explains why it cannot.
 *
 * Built explicitly rather than handed to `new Date(string)`, whose behaviour
 * on non-ISO input is implementation-defined — the same trap that made the old
 * Access parser stamp every historical transaction with the sync time.
 */
export function readWhen(
  dateText: string,
  timeText: string,
  meridiem: Meridiem,
  now: Date = new Date(),
): { readonly at: Date } | { readonly problem: string } {
  const d = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(dateText.trim());
  if (!d) return { problem: 'Write the date as day/month/year, like 22/08/2026.' };

  const t = /^(\d{1,2})\s*:\s*(\d{2})$/.exec(timeText.trim());
  if (!t) return { problem: 'Write the time as hours:minutes, like 2:07.' };

  const day = Number(d[1]);
  const month = Number(d[2]);
  const year = Number(d[3]);
  const hour = Number(t[1]);
  const minute = Number(t[2]);

  if (month < 1 || month > 12) return { problem: 'There is no month ' + month + '.' };
  if (hour < 1 || hour > 12) {
    // Someone reaching for 24-hour habit, or a slip. Say which clock this is
    // rather than "invalid": the field now takes 1–12 with am/pm beside it,
    // and the fix is obvious once that is stated.
    return { problem: 'Write the hour as 1 to 12, then choose am or pm.' };
  }
  if (minute > 59) return { problem: 'There is no minute ' + minute + '.' };

  const at = new Date(year, month - 1, day, toTwentyFourHour(hour, meridiem), minute, 0, 0);

  // Rebuilding the date is what catches 31 February: JavaScript rolls it
  // forward to 3 March without complaint, so the only way to know it was never
  // a real date is to check the parts came back out unchanged.
  if (at.getDate() !== day || at.getMonth() !== month - 1 || at.getFullYear() !== year) {
    return { problem: 'That day does not exist in that month.' };
  }

  if (at.getTime() > now.getTime()) {
    return { problem: 'That is in the future. A payment cannot have happened yet.' };
  }
  if (now.getTime() - at.getTime() > MAX_AGE_MS) {
    return { problem: 'That is more than two years ago. Check the year.' };
  }

  return { at };
}

export function WhenSheet({ visible, value, onCancel, onConfirm }: WhenSheetProps): React.JSX.Element | null {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Seeded from the current value each time the sheet opens, so it starts from
  // what the field already says rather than from blank.
  const [dateText, setDateText] = useState(
    () => `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`,
  );
  const [timeText, setTimeText] = useState(
    () => `${twelveHourOf(value)}:${pad(value.getMinutes())}`,
  );
  // Seeded, never defaulted — see toTwentyFourHour for why a control that
  // always opens on am is the same twelve-hour bug wearing a different hat.
  const [meridiem, setMeridiem] = useState<Meridiem>(() => meridiemOf(value));

  const read = useMemo(
    () => readWhen(dateText, timeText, meridiem),
    [dateText, timeText, meridiem],
  );
  const understood = 'at' in read ? read.at : null;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel} accessibilityViewIsModal>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Dismiss">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>When did it happen?</Text>

          <View style={styles.fields}>
            <RuledField
              index={1}
              label="Date"
              voice="identifier"
              value={dateText}
              onChangeText={(next) => setDateText(maskDate(next))}
              placeholder="22/08/2026"
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
            />
            <RuledField
              index={2}
              label="Time"
              voice="identifier"
              value={timeText}
              onChangeText={(next) => setTimeText(maskTime(next))}
              placeholder="2:07"
              keyboardType="number-pad"
              maxLength={5}
            />

            {/* Two buttons rather than a switch. A switch has an off state,
                and "not pm" is not a thing a person means — both halves of the
                day are a positive choice, and both must be equally visible or
                the unselected one stops being noticed. */}
            <View style={styles.meridiem} accessibilityRole="radiogroup">
              {(['am', 'pm'] as const).map((half) => {
                const on = meridiem === half;
                return (
                  <Pressable
                    key={half}
                    onPress={() => setMeridiem(half)}
                    style={({ pressed }) => [
                      styles.half,
                      on && styles.halfOn,
                      pressed && styles.halfPressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={half === 'am' ? 'Morning, a m' : 'Afternoon or evening, p m'}
                  >
                    <Text style={[styles.halfLabel, on && styles.halfLabelOn]}>
                      {half}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* What the app understood, written out. Same device as the amount
              field: the input shows what was typed, this states what it means,
              and confirming the wrong moment without seeing it is impossible. */}
          <Text style={understood !== null ? styles.understood : styles.problem}>
            {understood !== null
              ? `${understood.toLocaleDateString(undefined, FULL)} at ${understood.toLocaleTimeString(
                  undefined,
                  { hour: 'numeric', minute: '2-digit' },
                )}`
              : 'problem' in read
                ? read.problem
                : ''}
          </Text>

          <View style={styles.commit}>
            <ActionButton
              label="Use this time"
              loadingLabel="Use this time"
              disabled={understood === null}
              onPress={() => {
                if (understood !== null) onConfirm(understood);
              }}
            />
          </View>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.scrim,
    },
    sheet: {
      backgroundColor: theme.colors.surface.raised,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.rule.edge,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.text.primary,
    },
    fields: {
      marginTop: theme.spacing.sm,
    },
    meridiem: {
      flexDirection: 'row',
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    half: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.rule.edge,
      borderRadius: theme.radius.sm,
    },
    halfOn: {
      borderColor: theme.colors.action.base,
      backgroundColor: theme.colors.action.wash,
    },
    halfPressed: {
      opacity: 0.6,
    },
    halfLabel: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      textTransform: 'uppercase',
    },
    halfLabelOn: {
      color: theme.colors.text.primary,
    },
    understood: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.lg,
      minHeight: theme.typography.caption.lineHeight * 2,
    },
    problem: {
      ...theme.typography.caption,
      color: theme.colors.state.danger,
      marginTop: theme.spacing.lg,
      minHeight: theme.typography.caption.lineHeight * 2,
    },
    commit: {
      marginTop: theme.spacing.md,
    },
    secondary: {
      minHeight: 50,
      marginTop: theme.spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
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
