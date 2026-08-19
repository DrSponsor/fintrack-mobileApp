/**
 * AuthShell — the page furniture shared by sign in and open account.
 *
 * Both screens are the same document: a masthead ruled top and bottom, an open
 * headline block, the ruled form, and a footer band that ruled-off matches the
 * masthead. Holding that in one place is what stops the two screens drifting
 * apart, which is exactly how the four placeholder tabs ended up as copies of
 * each other.
 *
 * ── Full-bleed rules ─────────────────────────────────────────────────────
 * The rules run to the screen edge, past the content margin. Inset rules read
 * as card dividers; rules that reach the paper's edge read as a printed
 * document. It is the same single decision that carries the welcome screen,
 * and it is why the margin is applied per block here rather than as padding on
 * the scroll container.
 *
 * ── Reveal ordering ──────────────────────────────────────────────────────
 * The shell owns index 0 (masthead) and 1 (headline block), and pins the
 * footer last. Form content supplied as `children` should start its own
 * Reveals at FORM_REVEAL_START so the whole page arrives in reading order.
 */
import React, { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { Reveal } from '@/design-system/motion/Reveal';

/** First Reveal index available to form content. */
export const FORM_REVEAL_START = 2;
/** Footer arrives after any realistic amount of form content. */
const FOOTER_REVEAL_INDEX = 8;

/** Content margin. Rules deliberately ignore this and run to the screen edge. */
const MARGIN = 22;

export interface AuthShellProps {
  /** Right-hand masthead label. Micro caps. */
  readonly section: string;
  readonly headline: string;
  readonly standfirst: string;
  /** Footer band: the situation, then the way out of it. */
  readonly footerLabel: string;
  readonly footerAction: string;
  readonly onFooterPress: () => void;
  readonly children: React.ReactNode;
}

export function AuthShell({
  section,
  headline,
  standfirst,
  footerLabel,
  footerAction,
  onFooterPress,
  children,
}: AuthShellProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleBack = (): void => {
    // Deep links and the post-onboarding redirect can both land here with an
    // empty history, where back() is a no-op that looks like a broken control.
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/welcome');
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Masthead ───────────────────────────────────────────────────── */}
        <Reveal index={0}>
          <View style={styles.rule} />
          <View style={styles.masthead}>
            <Pressable
              onPress={handleBack}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.back}>←</Text>
            </Pressable>
            <Text style={styles.mark}>FINTRACK</Text>
            <View style={styles.mastheadSpacer} />
            <Text style={styles.section}>{section}</Text>
          </View>
          <View style={styles.rule} />
        </Reveal>

        {/* ── Headline: the open block ───────────────────────────────────── */}
        <Reveal index={1} style={styles.hero}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.standfirst}>{standfirst}</Text>
        </Reveal>

        {/* ── Form ───────────────────────────────────────────────────────── */}
        <View style={styles.form}>{children}</View>

        {/* Pushes the footer to the foot of the page on tall screens, and
            collapses to nothing once the keyboard shortens the viewport. */}
        <View style={styles.spacer} />

        {/* ── Footer band: rhymes with the masthead ──────────────────────── */}
        <Reveal index={FOOTER_REVEAL_INDEX}>
          <View style={styles.rule} />
          <Pressable
            onPress={onFooterPress}
            style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${footerLabel}. ${footerAction}`}
          >
            <Text style={styles.footerLabel}>{footerLabel}</Text>
            <Text style={styles.footerAction}>{footerAction} →</Text>
          </Pressable>
        </Reveal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    page: {
      flex: 1,
      // Transparent: the Material layer at the root owns the ground colour,
      // the atmospheric wash.
      backgroundColor: 'transparent',
    },
    content: {
      flexGrow: 1,
      paddingTop: theme.spacing.xxl,
      paddingBottom: theme.spacing.lg,
    },

    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.default,
    },

    masthead: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    back: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.secondary,
    },
    mark: {
      ...theme.typography.micro,
      color: theme.colors.text.primary,
      letterSpacing: 3.2,
    },
    mastheadSpacer: {
      flex: 1,
    },
    section: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.4,
    },

    hero: {
      paddingHorizontal: MARGIN,
      paddingTop: theme.spacing.xxl,
      paddingBottom: theme.spacing.xl,
    },
    headline: {
      ...theme.typography.display,
      color: theme.colors.text.primary,
    },
    standfirst: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
      maxWidth: 300,
    },

    form: {
      paddingHorizontal: MARGIN,
    },
    spacer: {
      flex: 1,
      minHeight: theme.spacing.xl,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: MARGIN,
      paddingVertical: theme.spacing.lg,
    },
    footerPressed: {
      backgroundColor: theme.colors.action.wash,
    },
    footerLabel: {
      ...theme.typography.micro,
      color: theme.colors.text.tertiary,
      letterSpacing: 1.4,
    },
    footerAction: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
  });
}
