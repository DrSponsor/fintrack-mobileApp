/**
 * Sign in.
 *
 * Composed as a ruled form on a document, matching welcome and the onboarding
 * stages: full-bleed rules, a numbered left rail, and the number face for
 * anything that is an identifier rather than language.
 *
 * Three things here are deliberate and easy to lose in a later edit:
 *
 *   THE KEYBOARD FLOW. Email returns to the password field; password submits.
 *   Ordinary, and its absence is one of the clearest signals that nobody ever
 *   used the screen they built.
 *
 *   SHOW/HIDE ON THE PASSWORD. A password field with no reveal is a guessing
 *   game, and it is worse here than usual because a failed sign-in costs a
 *   round trip. Set as a word rather than an eye icon: the eye is ambiguous
 *   (does it mean "it is hidden" or "tap to hide"?) and every app draws it
 *   differently, so nobody has learned it.
 *
 *   THE ERROR SITS ABOVE THE FIELDS. Below the button it is off-screen behind
 *   the keyboard at the exact moment it is generated.
 */
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { Reveal } from '@/design-system/motion/Reveal';
import { ActionButton, NoticeBand, RuledField } from '@/design-system/components';
import { AuthShell, FORM_REVEAL_START } from '@/features/auth/components/AuthShell';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { loginSchema, type LoginFormData } from '@/features/auth/schemas/auth.schemas';

export default function LoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const passwordRef = useRef<TextInput>(null);
  const [revealPassword, setRevealPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    const success = await login(data);
    if (success) {
      router.replace('/(app)');
    }
  };

  const submit = handleSubmit(onSubmit);

  return (
    <AuthShell
      section="SIGN IN"
      headline={'Welcome\nback.'}
      standfirst="Pick up exactly where your books left off."
      footerLabel="NO ACCOUNT YET"
      footerAction="Open one"
      onFooterPress={() => router.push('/(auth)/register')}
    >
      {error && !error.field && (
        <View style={styles.notice}>
          <NoticeBand message={error.message} code={error.code} />
        </View>
      )}

      <Reveal index={FORM_REVEAL_START}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <RuledField
              index={1}
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              value={value}
              onChangeText={(text) => {
                clearError();
                onChange(text);
              }}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />
      </Reveal>

      <Reveal index={FORM_REVEAL_START + 1}>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <RuledField
              ref={passwordRef}
              index={2}
              label="Password"
              placeholder="••••••••"
              secureTextEntry={!revealPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
              value={value}
              onChangeText={(text) => {
                clearError();
                onChange(text);
              }}
              onBlur={onBlur}
              error={errors.password?.message}
              trailing={
                <Pressable
                  onPress={() => setRevealPassword((shown) => !shown)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={revealPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.reveal}>{revealPassword ? 'HIDE' : 'SHOW'}</Text>
                </Pressable>
              }
            />
          )}
        />
      </Reveal>

      <Reveal index={FORM_REVEAL_START + 2} style={styles.commit}>
        <ActionButton
          label="Sign in"
          loadingLabel="Signing in…"
          loading={isLoading}
          onPress={() => void submit()}
        />
      </Reveal>
    </AuthShell>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    notice: {
      marginBottom: theme.spacing.sm,
    },
    reveal: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.2,
    },
    commit: {
      marginTop: theme.spacing.xxl,
    },
  });
}
