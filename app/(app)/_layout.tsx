import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@/design-system/ThemeProvider';
import {
  IconHome,
  IconLedger,
  IconAnalysis,
  IconBudget,
  IconSettings,
} from '@/design-system/icons/Icon';

export default function AppLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Transparent so the Material layer reads through the tab scenes.
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: theme.colors.action.base,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarStyle: {
          // A hairline top rule instead of a shadow — on a near-black ground a
          // drop shadow reads as smudge, while the lit edge reads as a plane.
          backgroundColor: theme.colors.surface.raised,
          borderTopColor: theme.colors.rule.edge,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          shadowOpacity: 0,
          height: 62,
          paddingBottom: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
        },
        tabBarLabelStyle: {
          ...theme.typography.label,
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => <IconHome color={color} size={size} weight={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="transactions/index"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size, focused }) => <IconLedger color={color} size={size} weight={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="analysis/index"
        options={{
          title: 'Analysis',
          tabBarIcon: ({ color, size, focused }) => <IconAnalysis color={color} size={size} weight={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="budgets/index"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color, size, focused }) => <IconBudget color={color} size={size} weight={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => <IconSettings color={color} size={size} weight={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="transactions/[id]"
        options={{
          href: null,
        }}
      />
      {/* Reached from the ledger's own header rather than the tab bar. Manual
          entry is something you do about a transaction, not a place in the app,
          and a sixth tab would say otherwise. */}
      <Tabs.Screen
        name="transactions/new"
        options={{
          href: null,
          // `href: null` removes the tab BUTTON, not the bar: the screen still
          // renders inside the navigator, so without this the bar sits under a
          // screen whose only exit is its own ✕. Five competing escape routes
          // contradict that ✕, and they cost 62pt of height on the one screen
          // where the keyboard is already taking half the viewport.
          tabBarStyle: { display: 'none' },
        }}
      />
      {/* Development inspector for the notification listener. Hidden rather
          than removed in production builds so the route always resolves; the
          screen itself is only linked from Settings under __DEV__. */}
      <Tabs.Screen
        name="capture-debug"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
