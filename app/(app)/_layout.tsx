import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/design-system/ThemeProvider';
import { House, Receipt, ChartBar, Wallet, Gear } from 'phosphor-react-native';

export default function AppLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent.green,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: theme.colors.bg.secondary,
          borderTopColor: theme.colors.border.default,
          elevation: 8,
          shadowOpacity: 0.1,
          height: 60,
          paddingBottom: theme.spacing.sm,
          paddingTop: theme.spacing.xs,
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
