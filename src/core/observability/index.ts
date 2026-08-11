import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
const SENTRY_DSN = extra.sentryDsn as string;
const POSTHOG_API_KEY = extra.posthogApiKey as string;
const POSTHOG_HOST = (extra.posthogHost as string) || 'https://app.posthog.com';
const APP_ENV = (extra.appEnv as string) || 'development';

export let posthogClient: PostHog | null = null;

export async function initSentry(): Promise<void> {
  if (!SENTRY_DSN) {
    console.log('[Observability] Sentry skipped: No DSN configured.');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: APP_ENV,
      debug: APP_ENV === 'development',
      // Add standard configurations here
      tracesSampleRate: APP_ENV === 'production' ? 0.2 : 1.0,
    });
    console.log('[Observability] Sentry initialized successfully.');
  } catch (error) {
    console.error('[Observability] Sentry initialization failed:', error);
  }
}

export async function initPostHog(): Promise<void> {
  if (!POSTHOG_API_KEY) {
    console.log('[Observability] PostHog skipped: No API Key configured.');
    return;
  }

  try {
    const client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
    await client.ready();
    posthogClient = client;
    console.log('[Observability] PostHog initialized successfully.');
  } catch (error) {
    console.error('[Observability] PostHog initialization failed:', error);
  }
}
