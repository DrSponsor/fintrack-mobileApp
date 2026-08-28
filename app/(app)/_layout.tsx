import React from 'react';
import { Tabs } from 'expo-router';
import { LedgerTabBar } from '@/design-system/components/LedgerTabBar';
import {
  IconHome,
  IconLedger,
  IconAnalysis,
  IconBudget,
  IconSettings,
} from '@/design-system/icons/Icon';

export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <LedgerTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Transparent so the Material layer reads through the tab scenes.
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => <IconHome color={color} size={size} weight={focused ? 2.2 : 1.75} />,
        }}
      />
      <Tabs.Screen
        name="transactions/index"
        options={{
          title: 'Entries',
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
