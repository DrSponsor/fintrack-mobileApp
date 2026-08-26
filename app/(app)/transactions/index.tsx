import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        {/* Manual entry lives here rather than in the tab bar: it is something
            you do about the ledger, not a place in the app. */}
        <Pressable
          onPress={() => router.push('/(app)/transactions/new')}
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
          accessibilityRole="button"
          accessibilityLabel="Record a transaction by hand"
        >
          <Text style={styles.addGlyph}>+</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.text}>Your transactions list will be displayed here.</Text>
        </View>
      </ScrollView>
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
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
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
    scrollContent: {
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface.raised,
      borderRadius: theme.radius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.rule.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
  });
}
