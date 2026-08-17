import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { registerSchema, type RegisterFormData, checkPasswordStrength, type PasswordStrength } from '@/features/auth/schemas/auth.schemas';
import { Check, X } from 'phosphor-react-native';

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
      paddingBottom: theme.spacing.xxl,
    },
    headerContainer: {
      marginBottom: theme.spacing.xl,
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
    strengthContainer: {
      marginTop: theme.spacing.xs,
      gap: 4,
    },
    strengthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    strengthText: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
    },
    strengthTextValid: {
      color: theme.colors.brass.base,
    },
    button: {
      backgroundColor: theme.colors.brass.base,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.lg,
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

function PasswordStrengthIndicator({ strength, theme }: { strength: PasswordStrength; theme: AppTheme }) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const rules = [
    { met: strength.hasMinLength, label: 'At least 8 characters' },
    { met: strength.hasUppercase, label: 'One uppercase letter' },
    { met: strength.hasLowercase, label: 'One lowercase letter' },
    { met: strength.hasDigit, label: 'One digit' },
    { met: strength.hasSpecial, label: 'One special character' },
  ];

  return (
    <View style={styles.strengthContainer}>
      {rules.map((rule) => (
        <View key={rule.label} style={styles.strengthRow}>
          {rule.met ? (
            <Check size={12} color={theme.colors.brass.base} weight="bold" />
          ) : (
            <X size={12} color={theme.colors.text.tertiary} weight="bold" />
          )}
          <Text style={[styles.strengthText, rule.met ? styles.strengthTextValid : undefined]}>
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function RegisterScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(
    checkPasswordStrength(''),
  );

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    const success = await register(data);
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Start tracking your finances with FinTrack
          </Text>
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
                    (errors.email || error?.field === 'email') ? styles.inputError : undefined,
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
            {error?.field === 'email' && (
              <Text style={styles.fieldError}>{error.message}</Text>
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
                  placeholder="Create a strong password"
                  placeholderTextColor={theme.colors.text.tertiary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  value={value}
                  onChangeText={(text) => {
                    clearError();
                    onChange(text);
                    setPasswordStrength(checkPasswordStrength(text));
                  }}
                  onBlur={onBlur}
                  accessibilityLabel="Password input"
                />
              )}
            />
            {errors.password && (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            )}
            <PasswordStrengthIndicator strength={passwordStrength} theme={theme} />
          </View>

          {/* Submit */}
          <Pressable
            style={[styles.button, isLoading ? styles.buttonDisabled : undefined]}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Create Account"
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#0F0F11" />
            ) : (
              <Text style={styles.buttonText}>Create Free Account</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
