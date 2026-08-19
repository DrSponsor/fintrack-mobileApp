/**
 * Error Boundary
 *
 * Wraps every major section of every screen. A chart that throws during
 * render shows a fallback. The rest of the screen continues to work.
 * Never a white screen.
 *
 * Logs errors to Sentry in production.
 *
 * Theming: The class component itself uses static tokens as a safe fallback.
 * The default fallback UI uses a themed functional wrapper when possible.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { colors, spacing, radius } from '@/design-system/tokens';
import { typography } from '@/design-system/typography';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
  readonly onError?: (error: Error, errorInfo: ErrorInfo) => void;
  readonly level?: 'section' | 'screen' | 'global';
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack, level: this.props.level ?? 'section' },
    });

    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.props.level === 'global'
              ? 'The app encountered an unexpected error. Your data is safe.'
              : 'This section encountered an error.'}
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Static styles using design tokens directly.
 *
 * Error boundaries are class components (React requirement) and cannot
 * use hooks. The fallback styles use the dark theme tokens as defaults
 * since the app is dark-first. For theme-aware error fallbacks, pass
 * a custom `fallback` prop from a parent that has theme context.
 */
const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emoji: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subheading,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.action.base,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.button,
    color: colors.surface.base, // Dark text on green button — works in both themes
  },
});
