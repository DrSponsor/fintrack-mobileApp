import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/design-system/ThemeProvider';
import type { FinTrackTheme } from '@/design-system/theme';

function createStyles(theme: FinTrackTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg.primary,
      paddingHorizontal: theme.spacing.xl,
      justifyContent: 'space-between',
      paddingTop: theme.spacing.xxxl,
      paddingBottom: theme.spacing.xxl,
    },
    heroContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      ...theme.typography.display,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    accentText: {
      color: theme.colors.accent.green,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    buttonContainer: {
      width: '100%',
      gap: theme.spacing.md,
    },
    primaryButton: {
      backgroundColor: theme.colors.accent.green,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      ...theme.typography.button,
      color: '#0F0F11',
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: theme.colors.border.strong,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      ...theme.typography.button,
      color: theme.colors.text.primary,
    },
  });
}

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.heroContainer}>
        <Text style={styles.title}>
          FinTrack<Text style={styles.accentText}>.ng</Text>
        </Text>
        <Text style={styles.subtitle}>
          Bank-grade automated finance tracking for Nigerian professionals. Know exactly where your money goes.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/login')}
          accessibilityRole="button"
          accessibilityLabel="Go to Sign In"
        >
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/register')}
          accessibilityRole="button"
          accessibilityLabel="Go to Register"
        >
          <Text style={styles.secondaryButtonText}>Create Free Account</Text>
        </Pressable>
      </View>
    </View>
  );
}
