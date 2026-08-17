import React, { useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';

interface SkeletonProps {
  readonly width?: number | `${number}%`;
  readonly height: number;
  readonly borderRadius?: number;
  readonly style?: ViewStyle;
}

export function Skeleton({ width = '100%', height, borderRadius, style }: SkeletonProps): React.JSX.Element {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000 }),
      -1, // Infinite repeat
      true // Reverse (pulse)
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const styles = StyleSheet.create({
    skeleton: {
      backgroundColor: theme.colors.surface.float,
      width: width as ViewStyle['width'],
      height: height,
      borderRadius: borderRadius ?? theme.radius.sm,
    },
  });

  return <Animated.View style={[styles.skeleton, style, animatedStyle]} />;
}
