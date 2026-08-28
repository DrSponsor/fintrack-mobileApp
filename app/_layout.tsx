import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import { database } from '@/core/database/database';
import { queryClient } from '@/core/api/queryClient';
import { ThemeProvider } from '@/design-system/ThemeProvider';
import { fontAssets } from '@/design-system/typography';
import { colors } from '@/design-system/tokens';
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

  // Font loading failure MUST be loud in development.
  //
  // The app deliberately still renders when fonts fail (below) — shipping a
  // blank screen because a typeface did not load would be worse. But that means
  // a failure degrades silently to Roboto, and every custom weight, the optical
  // tracking and the whole typographic hierarchy vanish with no error anywhere.
  // That is indistinguishable from "the design is just plain", which is exactly
  // the wrong thing to be unable to tell apart.
  useEffect(() => {
    if (!__DEV__) return;
    if (fontError) {
      console.error('[fonts] FAILED TO LOAD — falling back to system font:', fontError);
      return;
    }
    if (fontsLoaded) {
      console.log(`[fonts] loaded ${Object.keys(fontAssets).length} families:`, Object.keys(fontAssets).join(', '));
    }
  }, [fontsLoaded, fontError]);

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
      <QueryClientProvider client={queryClient}>
        <DatabaseProvider database={database}>
          <ThemeProvider preference={themePreference} onPreferenceChange={setThemePreference}>
            {/* Owns the app's ground colour and the atmospheric light wash
                behind content. Every screen below renders on a transparent
                background so the wash stays visible. */}
            <Material>
              <AppContent />
            </Material>
          </ThemeProvider>
        </DatabaseProvider>
      </QueryClientProvider>
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
  const hasCompletedOnboarding = useUIStore((state) => state.hasCompletedOnboarding);

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

  // Navigation guard — redirect based on auth and onboarding state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onOnboarding = segments[1] === 'onboarding';

    if (isLoggedIn && inAuthGroup) {
      router.replace('/(app)');
      return;
    }
    if (isLoggedIn) return;

    // Signed out. First launch gets onboarding; after that, straight to
    // welcome. Guarding on `onOnboarding` keeps this effect from fighting the
    // screen's own "Skip" navigation, which fires before the flag has
    // propagated back through the store.
    if (!hasCompletedOnboarding && !onOnboarding) {
      router.replace('/(auth)/onboarding');
    } else if (hasCompletedOnboarding && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    }
  }, [isLoggedIn, isLoading, hasCompletedOnboarding, segments, router]);

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
    // Imported from the token module rather than via useTheme(): this renders
    // ABOVE ThemeProvider, so the hook is unavailable — but `colors` is a plain
    // module export, so the value itself is still reachable. It was previously
    // a hardcoded hex with a comment asking future readers to keep it in sync
    // by hand, which is a promise nobody keeps. app.config.ts still duplicates
    // it because that file is evaluated outside the bundle.
    backgroundColor: colors.surface.base,
  },
});
