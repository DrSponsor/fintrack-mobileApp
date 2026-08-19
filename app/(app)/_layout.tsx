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
    </Tabs>
  );
}
