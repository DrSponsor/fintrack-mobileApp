import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { loginSchema, type LoginFormData } from '@/features/auth/schemas/auth.schemas';

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      // Transparent: the Material layer at the root owns the ground colour,
      // the atmospheric wash and the grain.
      backgroundColor: 'transparent',
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xxxl,
    },
    headerContainer: {
      marginBottom: theme.spacing.xxl,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    formContainer: {
      gap: theme.spacing.md,
    },
    fieldContainer: {
      gap: theme.spacing.xs,
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.text.primary,
    },
    input: {
      backgroundColor: theme.colors.surface.float,
      borderColor: theme.colors.rule.default,
      borderWidth: 1,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.md,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.body.fontFamily,
      fontSize: theme.typography.body.fontSize,
    },
    inputFocused: {
      borderColor: theme.colors.brass.base,
    },
    inputError: {
      borderColor: theme.colors.state.danger,
    },
    fieldError: {
      ...theme.typography.caption,
      color: theme.colors.state.danger,
      marginTop: 2,
    },
    globalError: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: theme.radius.sm,
      padding: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.state.danger,
    },
    globalErrorText: {
      ...theme.typography.body,
      color: theme.colors.state.danger,
    },
    button: {
      backgroundColor: theme.colors.brass.base,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...theme.typography.button,
      color: '#0F0F11',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.xl,
      gap: theme.spacing.xs,
    },
    footerText: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
    },
    footerLink: {
      ...theme.typography.bodyStrong,
      color: theme.colors.brass.base,
    },
  });
}

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const success = await login(data);
    if (success) {
      router.replace('/(app)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your FinTrack account</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Global API error */}
          {error && !error.field && (
            <View style={styles.globalError}>
              <Text style={styles.globalErrorText}>{error.message}</Text>
            </View>
          )}

          {/* Email field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email Address</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.email ? styles.inputError : undefined,
                  ]}
                  placeholder="e.g. adefope@gmail.com"
                  placeholderTextColor={theme.colors.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  value={value}
                  onChangeText={(text) => { clearError(); onChange(text); }}
                  onBlur={onBlur}
                  accessibilityLabel="Email address input"
                />
              )}
            />
            {errors.email && (
              <Text style={styles.fieldError}>{errors.email.message}</Text>
            )}
          </View>

          {/* Password field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.password ? styles.inputError : undefined,
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.text.tertiary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  value={value}
                  onChangeText={(text) => { clearError(); onChange(text); }}
                  onBlur={onBlur}
                  accessibilityLabel="Password input"
                />
              )}
            />
            {errors.password && (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            )}
          </View>

          {/* Submit */}
          <Pressable
            style={[styles.button, isLoading ? styles.buttonDisabled : undefined]}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#0F0F11" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.footerLink}>Register</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
