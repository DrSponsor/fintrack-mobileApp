/**
 * NoticeBand — a server-side failure, stated as a document annotation.
 *
 * The generic form of this is a rounded pink card with a 3px left border. It is
 * the same shape as a "success" toast and a "tip" callout, which is precisely
 * why it stops being read: the user has been trained that rounded tinted boxes
 * are chrome. This is a ruled band instead — hairlines above and below, the
 * same 2px marker the fields and ledger rows use, and the message set on the
 * measure rather than inside a container.
 *
 * It carries the error CODE, right-aligned in the number face. Real financial
 * software does this, and it is not developer leakage: it is the difference
 * between a user telling support "it didn't work" and telling them
 * "AUTH_INVALID_CREDENTIALS". It is also the honest signal that something
 * specific and identified went wrong, rather than a vague apology.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';
import type { AppTheme } from '../theme';
import { SETTLE, useReducedMotion } from '../motion/springs';

export interface NoticeBandProps {
  readonly message: string;
  /** Machine-readable cause, shown small and right-aligned. */
  readonly code?: string | undefined;
}

export function NoticeBand({ message, code }: NoticeBandProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const enter = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      enter.value = 1;
      return;
    }
    enter.value = withSpring(1, SETTLE);
  }, [enter, reducedMotion]);

  const bandStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * -8 }],
  }));

  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: enter.value }],
  }));

  return (
    <Animated.View
      style={[styles.band, bandStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.rule} />
      <View style={styles.body}>
        <Animated.View style={[styles.marker, markerStyle]} />
        <Text style={styles.message}>{message}</Text>
        {code !== undefined && <Text style={styles.code}>{code}</Text>}
      </View>
      <View style={styles.rule} />
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    band: {
      backgroundColor: theme.colors.state.dangerWash,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.state.danger,
    },
    body: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.md,
    },
    marker: {
      width: 2,
      height: 16,
      backgroundColor: theme.colors.state.danger,
    },
    message: {
      ...theme.typography.caption,
      color: theme.colors.state.danger,
      flex: 1,
    },
    code: {
      ...theme.typography.technicalSmall,
      color: theme.colors.state.danger,
      opacity: 0.6,
    },
  });
}
