/**
 * Where Google's authorisation lands.
 *
 * ── Why this file has to exist ───────────────────────────────────────────
 * It did not, and the whole flow died here. The server's callback page
 * deep-links to `fintrack://oauth/google?code=…`, the hook listened for that
 * URL with `Linking.addEventListener`, and the listener was correct — but
 * Expo Router ALSO resolves every incoming link against the route tree, found
 * nothing at /oauth/google, and pushed its "Unmatched Route" screen over the
 * top. The user tapped "Connect Gmail" and was shown "Page could not be
 * found", with the authorisation itself half-completed underneath.
 *
 * ── Why the route does the work rather than just existing ────────────────
 * A file that only absorbed the link and bounced back would fix the visible
 * error and leave the real one. The hook holds its expected `state` in the
 * connect screen; that screen is not mounted when Android has killed the app
 * while the browser was in front, which on a low-memory phone is ordinary
 * rather than rare. The link then starts the app cold, no listener exists, and
 * the code is dropped.
 *
 * So the callback belongs to a route, which is the one thing guaranteed to be
 * mounted by the link that carries the code — cold start included. The state
 * it validates against lives in MMKV for the same reason.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/design-system/ThemeProvider';
import type { AppTheme } from '@/design-system/theme';
import { api, readApiError } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { takePendingState } from '@/features/onboarding/connect/oauthState';

/** Everything downstream of a fresh connection. */
const AFFECTED = [['connect'], ['ledger'], ['accounts']];

function describe(err: unknown): string {
  const api = readApiError(err);
  if (api === null) return 'Could not reach the server. Check your connection and try again.';
  return api.message;
}

export default function OAuthCallbackScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();

  const [failure, setFailure] = useState<string | null>(null);
  // The exchange must happen once. Expo Router can re-render this screen with
  // the same params, and a second POST would spend an authorisation code that
  // Google has already redeemed.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // All of it inside the async path, so nothing here sets state during the
    // effect itself and triggers a second render before the first has painted.
    void (async () => {
      const expected = takePendingState();
      const code = typeof params.code === 'string' ? params.code : null;
      const state = typeof params.state === 'string' ? params.state : null;

      // Google reports a refusal by omitting the code, so this is the ordinary
      // "changed my mind" path and not a fault worth alarming anyone about.
      if (code === null) {
        router.replace('/(app)/connect?cancelled=1');
        return;
      }

      if (expected === null || state !== expected) {
        // Its own message on purpose: this is not a network problem, it means
        // a code arrived that this app never asked for.
        setFailure('That sign-in did not match this request. Please start again.');
        return;
      }

      try {
        await api.post(endpoints.capture.email.oauthCallback, { code });
        for (const key of AFFECTED) await queryClient.invalidateQueries({ queryKey: key });
        router.replace('/(app)/connect?connected=1');
      } catch (err) {
        setFailure(describe(err));
      }
    })();
  }, [params.code, params.state, queryClient]);

  return (
    <View style={styles.page}>
      {failure === null ? (
        <>
          <ActivityIndicator color={theme.colors.text.secondary} />
          <Text style={styles.label}>Finishing up</Text>
        </>
      ) : (
        <>
          <Text style={styles.failure}>{failure}</Text>
          <Text
            style={styles.action}
            accessibilityRole="button"
            onPress={() => router.replace('/(app)/connect')}
          >
            Try again
          </Text>
        </>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    page: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.surface.base,
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
    },
    failure: {
      ...theme.typography.body,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    action: {
      ...theme.typography.button,
      color: theme.colors.action.base,
    },
  });
}
