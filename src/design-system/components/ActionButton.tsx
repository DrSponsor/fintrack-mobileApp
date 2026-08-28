/**
 * ActionButton — the primary commit control.
 *
 * ── The loading state is the reason this component exists ────────────────
 * The default is an ActivityIndicator: a platform spinner, dropped into a
 * button that has been faded to 60% opacity. Both halves of that are wrong. A
 * spinner is the most anonymous element available on either platform, and
 * fading the control to grey the instant the user commits reads as the app
 * withdrawing — exactly the wrong signal at the one moment the user most wants
 * to feel something is happening.
 *
 * So: the surface stays at full strength, the label states the verb in progress
 * ("Signing in…"), and a short bar sweeps the lower edge. That sweep is the
 * same mark as the scan in the capture stage, which is the app's established
 * way of saying "this is being processed". Nothing here is borrowed from the
 * platform, and the control never looks disabled while it is working.
 *
 * ── The label centring, which has bitten this screen twice ───────────────
 * `justifyContent` centres vertically. Horizontal centring is `textAlign` on a
 * label that fills the width — NEVER `alignItems: 'center'`. alignItems makes
 * the Text size to its own content, which leaves it free to be compressed by
 * the container: first it wraps to two lines, and once wrapping is disabled it
 * truncates to "Open a…". A stretched label cannot be squeezed. This is
 * enforced here so no screen has to remember it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';
import type { AppTheme } from '../theme';
import { SNAP, useReducedMotion } from '../motion/springs';

const HEIGHT = 54;
const SWEEP_MS = 1050;
/** Fraction of the button the sweep bar occupies. */
const SWEEP_RATIO = 0.34;

export interface ActionButtonProps {
  readonly label: string;
  /** Shown in place of `label` while `loading`. State the verb in progress. */
  readonly loadingLabel: string;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
  readonly accessibilityHint?: string;
}

export function ActionButton({
  label,
  loadingLabel,
  loading = false,
  disabled = false,
  onPress,
  accessibilityHint,
}: ActionButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const press = useSharedValue(0);
  const sweep = useSharedValue(0);
  const [width, setWidth] = useState(0);

  const inactive = loading || disabled;

  useEffect(() => {
    if (!loading || reducedMotion) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return;
    }
    sweep.value = 0;
    sweep.value = withRepeat(
      withTiming(1, { duration: SWEEP_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(sweep);
  }, [loading, reducedMotion, sweep]);

  const handleLayout = (event: LayoutChangeEvent): void => {
    setWidth(event.nativeEvent.layout.width);
  };

  const handlePressIn = (): void => {
    press.value = withSpring(1, SNAP);
    // Confirms the touch landed before the network does. Failure here is never
    // worth surfacing — plenty of devices have no haptic motor at all.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePressOut = (): void => {
    press.value = withSpring(0, SNAP);
  };

  const surfaceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.015 }],
    // A disabled primary drops its fill entirely rather than fading it. See
    // the note on `surfaceDisabled` for why fading is the wrong instrument on
    // a dark ground.
    backgroundColor: disabled
      ? 'transparent'
      : interpolateColor(
          press.value,
          [0, 1],
          [theme.colors.action.base, theme.colors.action.deep],
        ),
  }));

  const sweepStyle = useAnimatedStyle(() => {
    const bar = width * SWEEP_RATIO;
    return {
      width: bar,
      // Travels the full measure plus its own length, so it enters and leaves
      // cleanly instead of appearing to pop in at the edges.
      transform: [{ translateX: -bar + sweep.value * (width + bar) }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={loading ? loadingLabel : label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      {...(accessibilityHint !== undefined ? { accessibilityHint } : {})}
    >
      <Animated.View
        style={[styles.surface, disabled && styles.surfaceDisabled, surfaceStyle]}
        onLayout={handleLayout}
      >
        <Text style={[styles.label, disabled && styles.labelDisabled]} numberOfLines={1}>
          {loading ? loadingLabel : label}
        </Text>
        {loading && (
          <View style={styles.sweepTrack} pointerEvents="none">
            <Animated.View style={[styles.sweepBar, sweepStyle]} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    // Fixed height, not vertical padding. Padding lets the control grow when a
    // label wraps, turning a button into a slab; a fixed height makes wrapping
    // visible as the bug it is rather than silently absorbing it.
    surface: {
      height: HEIGHT,
      borderRadius: theme.radius.sm,
      justifyContent: 'center',
      // Clips the sweep to the surface.
      overflow: 'hidden',
    },
    // Only a genuinely unavailable action recedes. A working action that is
    // merely in flight keeps its full presence.
    //
    // It recedes by losing its FILL, not by fading. Opacity is the wrong
    // instrument on a dark ground: fading a light surface toward a near-black
    // one barely dims it — paper at 40% over #080B12 computes to about
    // #656667, roughly 3.3:1 against the ground, so the dead control ends up
    // the brightest filled shape on the screen. Meanwhile the label, which is
    // dark ON that paper, fades toward the ground it is sitting against and
    // loses its contrast fastest. Both halves move the wrong way at once.
    //
    // An outline reads as unavailable at a glance and leaves the label legible.
    surfaceDisabled: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.rule.strong,
    },
    label: {
      ...theme.typography.button,
      color: theme.colors.action.on,
      textAlign: 'center',
    },
    // text.tertiary rather than text.disabled: 3.77:1 against the ground where
    // disabled would give 2.1:1. A control being unavailable is not a reason
    // for the user to be unable to read what it says.
    labelDisabled: {
      color: theme.colors.text.tertiary,
    },

    sweepTrack: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 2,
      overflow: 'hidden',
    },
    sweepBar: {
      height: 2,
      backgroundColor: theme.colors.action.on,
      opacity: 0.55,
    },
  });
}
