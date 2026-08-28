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

/**
 * Danger is the default because a band that interrupts is nearly always
 * reporting a failure. `success` exists for the one case that is not: an
 * action whose CONSEQUENCE the user could not otherwise see — a correction
 * that also rewrote earlier entries, say. It is not for confirming that
 * something ordinary worked; a control that visibly changes has already said
 * so, and a band on top of it is noise.
 */
export type NoticeTone = 'danger' | 'success';

export interface NoticeBandProps {
  readonly message: string;
  /** Machine-readable cause, shown small and right-aligned. */
  readonly code?: string | undefined;
  readonly tone?: NoticeTone;
}

export function NoticeBand({ message, code, tone = 'danger' }: NoticeBandProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, tone), [theme, tone]);
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

function createStyles(theme: AppTheme, tone: NoticeTone) {
  // One hue drives the whole band — rule, marker, message and code. Mixing
  // them is how a tinted band stops reading as a single object.
  const ink = tone === 'success' ? theme.colors.state.success : theme.colors.state.danger;
  const wash = tone === 'success' ? theme.colors.state.successWash : theme.colors.state.dangerWash;

  return StyleSheet.create({
    band: {
      backgroundColor: wash,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: ink,
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
      backgroundColor: ink,
    },
    message: {
      ...theme.typography.caption,
      color: ink,
      flex: 1,
    },
    code: {
      ...theme.typography.technicalSmall,
      color: ink,
      opacity: 0.6,
    },
  });
}
