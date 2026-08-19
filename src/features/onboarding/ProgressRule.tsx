/**
 * Onboarding progress — a segmented rule rather than dots.
 *
 * Dots are the default, and defaults are what make an app look like a
 * template. A ruled segment that lengthens belongs to the ledger
 * motif, and it carries more information than a dot: length shows position,
 * not just count.
 *
 * Each segment reads the live scroll offset rather than the settled page index,
 * so the rule grows *with your thumb* mid-drag and reverses if you change your
 * mind. Indicators that only update on settle are the tell that motion was an
 * afterthought.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/design-system/ThemeProvider';

const REST_WIDTH = 10;
const ACTIVE_WIDTH = 30;

interface ProgressRuleProps {
  readonly count: number;
  readonly scrollX: SharedValue<number>;
  readonly pageWidth: number;
}

export function ProgressRule({ count, scrollX, pageWidth }: ProgressRuleProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <Segment key={index} index={index} scrollX={scrollX} pageWidth={pageWidth} />
      ))}
    </View>
  );
}

interface SegmentProps {
  readonly index: number;
  readonly scrollX: SharedValue<number>;
  readonly pageWidth: number;
}

function Segment({ index, scrollX, pageWidth }: SegmentProps): React.JSX.Element {
  const { theme } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    // Guard against the first frame, before the pager has been measured.
    const page = pageWidth > 0 ? scrollX.value / pageWidth : 0;
    // 1 when this segment is centred, falling to 0 one page away.
    const proximity = Math.max(0, 1 - Math.abs(page - index));

    return {
      width: REST_WIDTH + (ACTIVE_WIDTH - REST_WIDTH) * proximity,
      backgroundColor: interpolateColor(
        proximity,
        [0, 1],
        [theme.colors.rule.strong, theme.colors.action.base],
      ),
    };
  });

  return <Animated.View style={[styles.segment, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segment: {
    height: 2,
    borderRadius: 1,
  },
});
