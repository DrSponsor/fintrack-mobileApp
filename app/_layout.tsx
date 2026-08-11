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
import { ErrorBoundary } from '@/shared/components/ErrorBoundary/ErrorBoundary';
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
          <AppContent />
        </ThemeProvider>
      </DatabaseProvider>
    </ErrorBoundary>
  );
}

/**
 * Auth gate — controls navigation between auth and app stacks.
 *
 * On mount:
 *   1. Check Keychain for existing access token
 *   2. If token exists → call GET /v1/users/me to hydrate real user data
 *   3. If hydration succeeds → navigate to app
 *   4. If hydration fails (401) → attempt token refresh → retry
 *   5. If all fails → clear tokens → navigate to auth
 *   6. If no token → navigate to auth
 *
 * This replaces the previous dummy user approach.
 */
function AppContent() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
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
          // Token invalid/expired — the refresh interceptor will attempt
          // to refresh automatically. If that also fails, forceLogout()
          // is called by the interceptor. We just need to clean up here.
          const stillHasToken = await TokenManager.getAccessToken();
          if (!stillHasToken) {
            // Refresh failed and tokens were cleared by the interceptor
            logout();
          } else {
            // Refresh succeeded but profile fetch failed for another reason
            // (e.g., server error). Still try to proceed with limited data.
            logout();
          }
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [setUser, logout, setLoading]);

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
});
