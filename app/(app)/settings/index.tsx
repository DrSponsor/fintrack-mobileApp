import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      // Transparent: the Material layer at the root owns the ground colour,
      // the atmospheric wash.
      backgroundColor: 'transparent',
    },
    header: {
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.rule.default,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text.primary,
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

    devRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.rule.default,
    },
    devLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.disabled,
      letterSpacing: 1.4,
    },
    devText: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      flex: 1,
    },
    devChevron: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
    },
  });
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.text}>Your account settings will be displayed here.</Text>
        </View>

        {/* Development only. The route stays registered in production so it
            always resolves, but nothing links to it there. Delete this block
            along with the inspector once the parser has a real corpus. */}
        {__DEV__ && (
          <Link href="/(app)/capture-debug" asChild>
            <Pressable style={styles.devRow} accessibilityRole="button">
              <Text style={styles.devLabel}>DEV</Text>
              <Text style={styles.devText}>Alert capture inspector</Text>
              <Text style={styles.devChevron}>→</Text>
            </Pressable>
          </Link>
        )}
      </ScrollView>
    </View>
  );
}
