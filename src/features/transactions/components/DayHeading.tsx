/**
 * DayHeading — the date rule that separates one day's entries from the next.
 *
 * ── Why the net is here and not just the date ────────────────────────────
 * A date alone is a divider. A date with what the day came to is a ledger:
 * it answers "how did today go" without the user adding anything up, which is
 * the question they opened the app to ask. Netting credits against debits is
 * also the only figure on this screen that says something no single row does.
 *
 * It is set quieter than the rows beneath it on purpose. The heading is
 * structure; the entries are the content. A summary that shouts louder than
 * what it summarises inverts the hierarchy and makes the list harder to read,
 * not easier.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { netNaira } from '../ledger';

export interface DayHeadingProps {
  readonly label: string;
  readonly netKobo: bigint;
}

export function DayHeading({ label, netKobo }: DayHeadingProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.net}>{netNaira(netKobo)}</Text>
      </View>
      <View style={styles.rule} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: theme.spacing.gutter,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    label: {
      ...theme.typography.micro,
      // Wider than the token's own tracking: at 11px caps this is a structural
      // label, and the extra air is what separates it from a row of content.
      letterSpacing: 1.2,
      color: theme.colors.text.secondary,
    },
    net: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
    },
    // Stronger than the hairline between entries, so a day boundary reads as a
    // different kind of break from a row boundary.
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.default,
      marginTop: theme.spacing.sm,
    },
  });
}
