/**
 * LedgerTabBar — the app's navigation, in the app's own vocabulary.
 *
 * ── What the default gives you, and why it dates the screen ──────────────
 * React Navigation's stock bar is an icon above a permanent text label, five
 * across, on a raised slab. That is the 2016–2019 Material pattern, and on a
 * 360dp screen five permanent labels do not fit: "DASHBOARD" and
 * "TRANSACTIONS" truncate to "DASHBOA…" and "TRANSAC…". A navigation bar whose
 * labels are cut off is not communicating; it is decoration that also fails.
 *
 * ── What this does instead ───────────────────────────────────────────────
 * Only the ACTIVE tab is named. Everything else is its icon. That is how a
 * current bar behaves, and it is honest about how people navigate: you do not
 * read four labels you are not going to tap. The space is still reserved, so
 * nothing moves as you switch.
 *
 * The indicator is a 2px rule that slides along the TOP EDGE of the bar,
 * landing over the active tab. It is the same mark the whole app uses for
 * "this one" — the tick on a live field, on a chosen picker row, beside a
 * ledger entry — and here it is drawn into the bar's own hairline, which is
 * exactly what FlowBar and BreakdownRow do with theirs. The bar's rule was
 * going to be there regardless; it now carries the state.
 *
 * ── The travel is the point ──────────────────────────────────────────────
 * A rule that MOVES between positions says the two tabs are places along one
 * surface. A dot that appears and disappears says nothing and is cheaper to
 * ignore. This is the one piece of motion in the chrome, so it is worth
 * spending on — and it is skipped entirely under reduce-motion, where it
 * simply cuts to the new position.
 */
import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../ThemeProvider';
import type { AppTheme } from '../theme';
import { SETTLE, useReducedMotion } from '../motion/springs';

/** Width of the sliding rule. Narrower than a tab, so it reads as a mark on
 *  the line rather than a segment of it. */
const MARK_WIDTH = 26;
const ICON_SIZE = 23;

export function LedgerTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.JSX.Element | null {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  // The screen's width, not a measured one.
  //
  // This was onLayout, and onLayout reported 225dp on a 360dp screen: the
  // navigator gives a custom tab bar no definite width, so the bar
  // shrink-wrapped, 'flex: 1' tabs collapsed to their own content, and the
  // five icons packed into the left 62% of the bar. Every label then measured
  // against an icon rather than a tab, which is what truncated "Entries" to
  // "ENTRI…" inside a slot with room to spare. Neither alignSelf:'stretch'
  // nor width:'100%' fixes it, because a percentage of an indefinite width is
  // still indefinite. A bottom tab bar spans the window by definition, so the
  // window is the honest source.
  const { width } = useWindowDimensions();
  const slide = useSharedValue(0);

  // A screen can still opt out — manual entry does, because its only exit is
  // its own ✕ and five competing escape routes contradict that.
  const active = state.routes[state.index];
  const activeOptions = active !== undefined ? descriptors[active.key]?.options : undefined;
  const hidden =
    activeOptions?.tabBarStyle !== undefined &&
    (StyleSheet.flatten(activeOptions.tabBarStyle) as { display?: string } | undefined)?.display ===
      'none';

  // Routes the bar actually draws.
  //
  // Filtered on whether the route declared an ICON, not on expo-router's
  // `href: null`. That flag hides a route from the default tab bar, but it is
  // not surfaced on the navigator's descriptor options, so a custom bar sees
  // every route in the group — here eight, of which three are the detail
  // screen, manual entry and the capture inspector. They rendered as empty
  // slots: five icons dividing the width by eight, packed into the left 62%.
  //
  // An icon is the honest test, because this bar cannot draw a route without
  // one. It also fails safe — a new tab that forgets its icon is absent rather
  // than present and invisible.
  const visible = state.routes.filter(
    (route) => descriptors[route.key]?.options.tabBarIcon !== undefined,
  );

  const activeVisibleIndex = visible.findIndex((route) => route.key === active?.key);
  const tabWidth = visible.length > 0 ? width / visible.length : 0;

  // In an effect, not during render: writing a shared value is a side effect,
  // and React may render more than once for a single committed update.
  useEffect(() => {
    if (tabWidth <= 0 || activeVisibleIndex < 0) return;
    const target = activeVisibleIndex * tabWidth + (tabWidth - MARK_WIDTH) / 2;
    slide.value = reducedMotion ? target : withSpring(target, SETTLE);
  }, [activeVisibleIndex, tabWidth, reducedMotion, slide]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value }],
  }));

  if (hidden) return null;

  return (
    <View style={[styles.bar, { width, paddingBottom: insets.bottom + theme.spacing.sm }]}>
      <View style={styles.rule} />
      {tabWidth > 0 && activeVisibleIndex >= 0 && (
        <Animated.View style={[styles.mark, markStyle]} pointerEvents="none" />
      )}

      <View style={styles.tabs}>
        {visible.map((route) => {
          const options = descriptors[route.key]?.options;
          const focused = route.key === active?.key;
          const label =
            typeof options?.title === 'string' ? options.title : route.name;

          const onPress = (): void => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (focused || event.defaultPrevented) return;
            Haptics.selectionAsync().catch(() => {});
            navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              // The label is only DRAWN for the active tab; every tab still
              // announces its name, or the bar would be unusable with a screen
              // reader.
              accessibilityLabel={label}
            >
              {options?.tabBarIcon?.({
                focused,
                color: focused ? theme.colors.action.base : theme.colors.text.tertiary,
                size: ICON_SIZE,
              })}
              {/* Space is reserved whether or not the label is drawn, so
                  switching tabs never nudges the icons. */}
              <View style={styles.labelSlot}>
                {focused && (
                  <Text style={styles.label} numberOfLines={1}>
                    {label}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    // Stretched explicitly. The navigator does not give a custom tab bar a
    // definite width, so without this the bar shrink-wraps its content — and
    // 'flex: 1' tabs inside an indefinite-width row collapse to their own
    // content instead of dividing the screen. The five icons then cluster in
    // the left 62% and every label measures against an icon rather than a tab.
    bar: {
      backgroundColor: theme.colors.surface.raised,
      paddingTop: theme.spacing.sm,
    },
    // The bar's own top hairline — the line the indicator rides.
    rule: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.rule.default,
    },
    mark: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: MARK_WIDTH,
      height: 2,
      backgroundColor: theme.colors.action.base,
    },
    tabs: {
      flexDirection: 'row',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: theme.spacing.sm,
      minHeight: 48,
    },
    // Stretched to the full tab, not sized to its own content. Under the
    // parent's alignItems:'center' the slot shrink-wraps, and the label then
    // measures against the icon's width rather than the tab's — which is how
    // "Entries" truncated to "ENTRI…" inside a 72dp slot that had room for it.
    labelSlot: {
      alignSelf: 'stretch',
      height: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.xs,
    },
    label: {
      ...theme.typography.micro,
      fontSize: 10,
      letterSpacing: 0.8,
      color: theme.colors.action.base,
    },
  });
}
