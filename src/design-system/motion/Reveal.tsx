/**
 * Reveal — the staggered entrance used across the auth screens.
 *
 * A screen whose elements all appear at once reads as a page load. A screen
 * whose elements arrive in reading order reads as something being *composed*
 * for you, which is most of the difference between "fast" and "expensive".
 *
 * The stagger is deliberately short (68ms) and the travel deliberately small
 * (14px). Long, far entrances are the most common way an animated screen ends
 * up feeling slow — the user is waiting on choreography rather than reading.
 * The intent is that a returning user never consciously notices this ran.
 *
 * `index` is the element's position in reading order, so a screen just numbers
 * its blocks 0,1,2… rather than hand-computing delays that drift apart the
 * moment a block is inserted.
 */
import React, { useEffect, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { SETTLE, useReducedMotion } from './springs';

/** Held before the first element moves, so the screen is not already animating
 *  as it is pushed onto the stack — two overlapping motions read as jitter. */
const BASE_DELAY_MS = 90;
const STAGGER_MS = 68;
const DISTANCE = 14;

/**
 * The stagger stops compounding after this position.
 *
 * Without a cap the delay is unbounded in the number of blocks on the screen,
 * and it bites exactly where it is least affordable: the dashboard numbers its
 * blocks up to 11, which is 90 + 11×68 = 838ms before the last control appears.
 * Nearly a second of an inert button is not choreography, it is lag — and the
 * elements furthest down the list are the ones a returning user scrolls to
 * deliberately.
 *
 * Six steps is ~500ms, which is long enough to read as a sequence and short
 * enough that nothing feels withheld. Past that everything arrives together.
 */
const MAX_STAGGER_STEPS = 6;

interface RevealProps {
  /** Position in reading order. Delay is derived from this. */
  readonly index?: number;
  /** Extra delay on top of the index stagger, in ms. */
  readonly extraDelay?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: React.ReactNode;
}

export function Reveal({
  index = 0,
  extraDelay = 0,
  style,
  children,
}: RevealProps): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  const delay = useMemo(
    () => BASE_DELAY_MS + Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS + extraDelay,
    [index, extraDelay],
  );

  useEffect(() => {
    if (reducedMotion) {
      // Collapse to the finished state rather than fading: for a vestibular
      // user the fade is not the problem, the travel is, and a fade still
      // delays the content for no benefit.
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withSpring(1, SETTLE));
  }, [delay, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * DISTANCE }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
