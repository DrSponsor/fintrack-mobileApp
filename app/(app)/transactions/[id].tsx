import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/design-system/ThemeProvider';

export default function TransactionDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg.primary,
      padding: theme.spacing.lg,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    card: {
      backgroundColor: theme.colors.bg.secondary,
      borderRadius: theme.radius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.sm,
    },
    value: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction Details</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Transaction ID</Text>
        <Text style={styles.value}>{id}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>Details placeholder</Text>
      </View>
    </View>
  );
}
