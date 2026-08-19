/**
 * Stage 1 — Capture.
 *
 * Shows the product's actual mechanism rather than an icon of it: a raw bank
 * alert arrives, a light scan sweeps it, and a clean ledger entry assembles
 * underneath. The alert text is real GTBank alert phrasing, because the whole
 * point being made is "we read the message your bank already sends you", and a
 * fake-looking message undermines exactly that claim.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { useReducedMotion } from '@/design-system/motion/springs';
import { easeIn, easeOut, phase } from '../timeline';

const LOOP_MS = 4600;
const CARD_HEIGHT = 78;

interface StageProps {
  readonly isActive: boolean;
}

export function CaptureStage({ isActive }: StageProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const clock = useSharedValue(0);

  useEffect(() => {
    if (!isActive || reducedMotion) {
      cancelAnimation(clock);
      // Park on the held frame so a reduced-motion user, or an off-screen
      // slide, still shows the finished composition rather than an empty stage.
      clock.value = 0.7;
      return;
    }
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, { duration: LOOP_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(clock);
  }, [isActive, reducedMotion, clock]);

  // The raw alert: slides down into place, then dims once it has been read.
  const alertStyle = useAnimatedStyle(() => {
    const enter = easeOut(phase(clock.value, 0, 0.1));
    const exit = easeIn(phase(clock.value, 0.88, 1));
    const read = phase(clock.value, 0.3, 0.4);
    return {
      opacity: (0.35 + enter * 0.65 - read * 0.45) * (1 - exit),
      transform: [{ translateY: (1 - enter) * -14 }],
    };
  });

  // The scan sweeping the alert — the moment of parsing.
  const scanStyle = useAnimatedStyle(() => {
    const sweep = phase(clock.value, 0.16, 0.4);
    const visible = sweep > 0 && sweep < 1 ? 1 : 0;
    return {
      opacity: visible,
      transform: [{ translateY: sweep * CARD_HEIGHT }],
    };
  });

  // The parsed ledger entry assembling: marker, then body, then amount.
  const markerStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, 0.38, 0.5));
    const exit = easeIn(phase(clock.value, 0.88, 1));
    return {
      opacity: t * (1 - exit),
      transform: [{ scaleY: t }],
    };
  });

  const bodyStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, 0.44, 0.58));
    const exit = easeIn(phase(clock.value, 0.88, 1));
    return {
      opacity: t * (1 - exit),
      transform: [{ translateX: (1 - t) * -10 }],
    };
  });

  const amountStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, 0.5, 0.64));
    const exit = easeIn(phase(clock.value, 0.88, 1));
    return {
      opacity: t * (1 - exit),
      transform: [{ translateY: (1 - t) * 12 }],
    };
  });

  const ruleStyle = useAnimatedStyle(() => {
    const t = easeOut(phase(clock.value, 0.4, 0.62));
    const exit = easeIn(phase(clock.value, 0.88, 1));
    return { opacity: t * (1 - exit), transform: [{ scaleX: t }] };
  });

  return (
    <View style={styles.stage}>
      {/* Raw inbound alert */}
      <Animated.View style={[styles.alert, alertStyle]}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertFrom}>GTBank</Text>
          <Text style={styles.alertTime}>09:42</Text>
        </View>
        <Text style={styles.alertBody} numberOfLines={2}>
          Debit Alert{'\n'}Acct: ***4471 NGN45,900.00
        </Text>

        {/* The scan sweep, clipped to the card */}
        <Animated.View style={[styles.scan, scanStyle]} pointerEvents="none">
          <View style={styles.scanGlow} />
          <View style={styles.scanLine} />
        </Animated.View>
      </Animated.View>

      {/* Parsed result */}
      <View style={styles.result}>
        <Animated.View style={[styles.resultMarker, markerStyle]} />
        <Animated.View style={[styles.resultBody, bodyStyle]}>
          <Text style={styles.resultMerchant}>Jumia</Text>
          <Text style={styles.resultMeta}>Shopping · Ref 4471</Text>
        </Animated.View>
        <Animated.Text style={[styles.resultAmount, amountStyle]}>−₦45,900.00</Animated.Text>
      </View>
      <Animated.View style={[styles.resultRule, ruleStyle]} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    stage: {
      justifyContent: 'center',
    },

    alert: {
      height: CARD_HEIGHT,
      backgroundColor: theme.colors.surface.float,
      borderRadius: theme.radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.rule.default,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      // Clips the scan sweep to the card's bounds.
      overflow: 'hidden',
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    alertFrom: {
      ...theme.typography.micro,
      color: theme.colors.text.secondary,
    },
    alertTime: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.disabled,
    },
    alertBody: {
      ...theme.typography.technicalSmall,
      color: theme.colors.text.tertiary,
    },

    scan: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: -28,
      height: 28,
      justifyContent: 'flex-end',
    },
    scanGlow: {
      flex: 1,
      backgroundColor: theme.colors.action.wash,
    },
    scanLine: {
      height: StyleSheet.hairlineWidth * 2,
      backgroundColor: theme.colors.action.base,
    },

    result: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
    },
    resultMarker: {
      width: StyleSheet.hairlineWidth * 3,
      height: 22,
      backgroundColor: theme.colors.action.base,
      marginRight: theme.spacing.md,
    },
    resultBody: {
      flex: 1,
    },
    resultMerchant: {
      ...theme.typography.bodyStrong,
      color: theme.colors.text.primary,
    },
    resultMeta: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      marginTop: 1,
    },
    resultAmount: {
      ...theme.typography.amountRow,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.md,
    },
    resultRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.faint,
    },
  });
}
