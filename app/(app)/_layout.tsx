import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@/design-system/ThemeProvider';
import { House, Receipt, ChartBar, Wallet, Gear } from 'phosphor-react-native';

export default function AppLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Transparent so the Material layer reads through the tab scenes.
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: theme.colors.brass.base,
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
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions/index"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="analysis/index"
        options={{
          title: 'Analysis',
          tabBarIcon: ({ color, size }) => <ChartBar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="budgets/index"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Gear color={color} size={size} />,
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
