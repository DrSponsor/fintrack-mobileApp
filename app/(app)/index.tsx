import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useAuthStore } from '@/core/store/auth.store';
import { useSyncStore } from '@/core/store/sync.store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'expo-router';

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      // Transparent: the Material layer at the root owns the ground colour,
      // the atmospheric wash and the grain.
      backgroundColor: 'transparent',
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    welcomeText: {
      ...theme.typography.heading,
      color: theme.colors.text.primary,
    },
    emailText: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    syncBadge: {
      backgroundColor: theme.colors.surface.raised,
      borderColor: theme.colors.rule.default,
      borderWidth: 1,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    syncText: {
      ...theme.typography.caption,
      color: theme.colors.brass.base,
    },
    balanceCard: {
      backgroundColor: theme.colors.surface.raised,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
      ...theme.shadow.popover,
    },
    balanceLabel: {
      ...theme.typography.label,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
    },
    balanceAmount: {
      ...theme.typography.display,
      color: theme.colors.text.primary,
    },
    sectionTitle: {
      ...theme.typography.subheading,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    placeholderCard: {
      backgroundColor: theme.colors.surface.raised,
      borderRadius: theme.radius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.rule.default,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    placeholderText: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    logoutButton: {
      borderColor: theme.colors.rule.strong,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    logoutText: {
      ...theme.typography.button,
      color: theme.colors.state.danger,
    },
  });
}

export default function DashboardScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const syncStatus = useSyncStore((state) => state.status);
  const { logout, isLoading } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hello</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>
          <View style={styles.syncBadge}>
            <Text style={styles.syncText}>Sync: {syncStatus.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
          <Text style={styles.balanceAmount}>₦0.00</Text>
        </View>

        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>No transactions recorded yet.</Text>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Sign Out"
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
