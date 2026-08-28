/**
 * Open an account.
 *
 * The sibling of sign in, and deliberately the same document — same masthead,
 * same numbered rail, same ruled fields — because a signup that looks unlike
 * the login it sits beside is how an app starts feeling assembled.
 *
 * Two things differ, and both are on purpose:
 *
 *   THE PASSWORD METER replaces the five-row tick list. See PasswordMeter for
 *   the reasoning; the short version is that the list cost eighty vertical
 *   pixels on the one screen where the keyboard can least afford them.
 *
 *   THE PASSWORD DEFAULTS TO VISIBLE. On sign-in, hiding is right — the user
 *   is typing something they already know, in public, and shoulder-surfing is
 *   the live risk. On signup they are *composing* a password against five
 *   stated rules, and hiding it turns that into a guessing game for no security
 *   benefit: the secret does not exist yet, and it is on screen for seconds.
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
import { PasswordMeter } from '@/features/auth/components/PasswordMeter';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  registerSchema,
  checkPasswordStrength,
  type RegisterFormData,
  type PasswordStrength,
} from '@/features/auth/schemas/auth.schemas';

export default function RegisterScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const passwordRef = useRef<TextInput>(null);
  const [hidePassword, setHidePassword] = useState(false);
  const [strength, setStrength] = useState<PasswordStrength>(() => checkPasswordStrength(''));
  // Drives the meter's opening state: before the first keystroke it states the
  // requirements rather than reporting five failures.
  const [passwordTouched, setPasswordTouched] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    const success = await register(data);
    if (success) {
      router.replace('/(app)');
    }
  };

  const submit = handleSubmit(onSubmit);

  // A field-scoped server error ("that email is taken") belongs on the field,
  // not in the banner — the banner is for failures with nowhere else to go.
  const emailError = errors.email?.message ?? (error?.field === 'email' ? error.message : undefined);

  return (
    <AuthShell
      section="OPEN ACCOUNT"
      headline={'Open an\naccount.'}
      standfirst="Two fields. Your books start the moment the first alert lands."
      footerLabel="ALREADY REGISTERED"
      footerAction="Sign in"
      onFooterPress={() => router.push('/(auth)/login')}
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
              voice="identifier"
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
              error={emailError}
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
              voice="identifier"
              placeholder="Something only you would write"
              secureTextEntry={hidePassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
              value={value}
              onChangeText={(text) => {
                clearError();
                onChange(text);
                setStrength(checkPasswordStrength(text));
                setPasswordTouched(text.length > 0);
              }}
              onBlur={onBlur}
              error={errors.password?.message}
              trailing={
                <Pressable
                  onPress={() => setHidePassword((hidden) => !hidden)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={hidePassword ? 'Show password' : 'Hide password'}
                >
                  <Text style={styles.reveal}>{hidePassword ? 'SHOW' : 'HIDE'}</Text>
                </Pressable>
              }
            />
          )}
        />
      </Reveal>

      <Reveal index={FORM_REVEAL_START + 2}>
        <PasswordMeter strength={strength} touched={passwordTouched} />
      </Reveal>

      <Reveal index={FORM_REVEAL_START + 3} style={styles.commit}>
        <ActionButton
          label="Open my account"
          loadingLabel="Opening…"
          loading={isLoading}
          onPress={() => void submit()}
        />
        <Text style={styles.legal}>
          Opening an account means you accept the Terms of Service and the Privacy Policy.
        </Text>
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
      marginTop: theme.spacing.xl,
    },
    legal: {
      ...theme.typography.caption,
      color: theme.colors.text.disabled,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
  });
}
