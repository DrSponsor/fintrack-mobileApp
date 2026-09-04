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
 * only person who opens this. Four digits and a colon beats spinning a drum.
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
 * Reads "DD/MM/YYYY" and "HH:MM" into a moment, or explains why it cannot.
 *
 * Built explicitly rather than handed to `new Date(string)`, whose behaviour
 * on non-ISO input is implementation-defined — the same trap that made the old
 * Access parser stamp every historical transaction with the sync time.
 */
export function readWhen(
  dateText: string,
  timeText: string,
  now: Date = new Date(),
): { readonly at: Date } | { readonly problem: string } {
  const d = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(dateText.trim());
  if (!d) return { problem: 'Write the date as day/month/year, like 22/08/2026.' };

  const t = /^(\d{1,2})\s*:\s*(\d{2})$/.exec(timeText.trim());
  if (!t) return { problem: 'Write the time as hours:minutes on a 24-hour clock, like 14:07.' };

  const day = Number(d[1]);
  const month = Number(d[2]);
  const year = Number(d[3]);
  const hour = Number(t[1]);
  const minute = Number(t[2]);

  if (month < 1 || month > 12) return { problem: 'There is no month ' + month + '.' };
  if (hour > 23) return { problem: 'There is no hour ' + hour + ' on a 24-hour clock.' };
  if (minute > 59) return { problem: 'There is no minute ' + minute + '.' };

  const at = new Date(year, month - 1, day, hour, minute, 0, 0);

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
    () => `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  );

  const read = useMemo(() => readWhen(dateText, timeText), [dateText, timeText]);
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
              onChangeText={setDateText}
              placeholder="22/08/2026"
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
            />
            <RuledField
              index={2}
              label="Time · 24-hour"
              voice="identifier"
              value={timeText}
              onChangeText={setTimeText}
              placeholder="14:07"
              keyboardType="number-pad"
              maxLength={5}
            />
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
