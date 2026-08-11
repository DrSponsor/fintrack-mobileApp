import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { FinTrackTheme } from '@/design-system/theme';

function createStyles(theme: FinTrackTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg.primary,
    },
    header: {
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.default,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.text.primary,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.bg.secondary,
      borderRadius: theme.radius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
  });
}

export default function BudgetsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.text}>Your budget tracking will be displayed here.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
