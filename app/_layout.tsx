import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from '@/core/database/database';
import { ThemeProvider } from '@/design-system/ThemeProvider';
import { fontAssets } from '@/design-system/typography';
import { useUIStore } from '@/core/store/ui.store';
import { useAuthStore } from '@/core/store/auth.store';
import { TokenManager } from '@/core/security/TokenManager';
import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { forceLogout } from '@/core/api/interceptors/refresh.interceptor';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary/ErrorBoundary';
import { Material } from '@/design-system/material/Material';
import { initSentry, initPostHog } from '@/core/observability';
import type { UserProfile } from '@/features/auth/types';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

// Root layout wraps with all the global providers
export default function RootLayout() {
  const themePreference = useUIStore((state) => state.themePreference);
  const setThemePreference = useUIStore((state) => state.setThemePreference);

  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // Initialize Sentry and PostHog after mount (non-blocking)
  useEffect(() => {
    void initSentry();
    void initPostHog();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary level="global">
      <DatabaseProvider database={database}>
        <ThemeProvider preference={themePreference} onPreferenceChange={setThemePreference}>
          {/* Owns the app's ground colour, the atmospheric light wash behind
              content and the film grain over it. Every screen below renders on
              a transparent background so all three stay visible. */}
          <Material>
            <AppContent />
          </Material>
        </ThemeProvider>
      </DatabaseProvider>
    </ErrorBoundary>
  );
}

/**
 * Auth gate — controls navigation between auth and app stacks.
 *
 * On mount:
 *   1. Check Keychain for existing access token. None → navigate to auth.
 *   2. Token exists → call GET /v1/users/me to hydrate real user data.
 *      A 401 here triggers the refresh interceptor's silent refresh
 *      automatically, before this call ever sees the rejection.
 *   3. Hydration succeeds → navigate to app with full profile data.
 *   4. Hydration fails and no token remains → refresh itself failed;
 *      forceLogout() (shared with the refresh interceptor) → navigate to auth.
 *   5. Hydration fails but a token still remains → refresh succeeded, or
 *      this was a transient non-auth failure (network/5xx). Navigate to
 *      app authenticated-without-profile; the profile is refetched later.
 *      A transient error must never evict a valid session.
 */
function AppContent() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const markAuthenticated = useAuthStore((state) => state.markAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const segments = useSegments();
  const router = useRouter();

  // Check auth state on mount — hydrate real user from backend
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await TokenManager.getAccessToken();
        if (!token) {
          logout();
          return;
        }

        // Token exists — validate it by fetching real user profile
        try {
          const profile = await api.get<UserProfile>(endpoints.users.me);
          setUser({
            id: profile.id,
            email: profile.email,
            tier: profile.tier,
            createdAt: profile.createdAt,
          });
        } catch {
          // Token invalid/expired — the refresh interceptor will already
          // have attempted a silent refresh if this was a 401. Two
          // distinct outcomes reach this catch:
          const stillHasToken = await TokenManager.getAccessToken();
          if (!stillHasToken) {
            // Refresh failed and the interceptor already cleared Keychain
            // tokens. Route through the same forceLogout() the interceptor
            // uses so this call site can never drift from it (Keychain +
            // store always cleared together).
            await forceLogout();
          } else {
            // A valid token remains — either refresh succeeded, or this
            // wasn't a 401 at all (e.g. a transient network drop or 5xx
            // on cold start). Per "offline is the default state," a
            // transient profile-fetch failure must not evict a valid
            // session. Mark authenticated without profile data; screens
            // render from the WatermelonDB cache and the profile is
            // refetched later (foreground refresh / pull-to-refresh).
            markAuthenticated();
          }
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [setUser, logout, setLoading, markAuthenticated]);

  // Navigation guard — redirect based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [isLoggedIn, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Pure black screen with no spinner — splash screen handles the branding.
            This is only visible for the ~50ms between splash hide and content render. */}
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Without this the navigator paints its own opaque scene background
        // over the Material layer's atmosphere.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    // Hardcoded rather than themed: this renders above ThemeProvider in the
    // tree, so useTheme() is unavailable here. Must stay in sync with
    // colors.surface.base and the splash backgroundColor in app.config.ts.
    backgroundColor: '#080B12',
  },
});
