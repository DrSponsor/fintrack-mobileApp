import type { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_STAGING = process.env.APP_ENV === 'staging';
const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID ?? '6e6f1650-a353-499f-91de-6f3776daf3fc';

/**
 * Where the app talks to.
 *
 * The two hostnames below do not exist yet. Neither did they when the build
 * profiles were written, which is how a build could have been shipped that
 * signs a person up and then fails on every request afterwards — the failure
 * looks like a broken app rather than a missing server.
 *
 * So a build for anybody else MUST pass EXPO_PUBLIC_API_URL explicitly:
 *
 *   EXPO_PUBLIC_API_URL=https://… eas build --profile demo --platform android
 */
const getApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (process.env.DEV_API_URL) return process.env.DEV_API_URL;
  if (IS_DEV) return 'http://10.0.2.2:3000'; // Android emulator → host machine
  // Placeholders, not deployments. A build that reaches either of these is a
  // build nobody supplied a real server to.
  if (IS_STAGING) return 'https://staging-api.fintrack.ng';
  return 'https://api.fintrack.ng';
};

const getAppName = (): string => {
  if (IS_DEV) return 'FinTrack (Dev)';
  if (IS_STAGING) return 'FinTrack (Staging)';
  return 'FinTrack';
};

const getBundleId = (): string => {
  if (IS_DEV) return 'ng.fintrack.app.dev';
  if (IS_STAGING) return 'ng.fintrack.app.staging';
  return 'ng.fintrack.app';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'fintrack-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'fintrack',
  userInterfaceStyle: 'automatic',
  // New Architecture is disabled — see KNOWN_ISSUES.md for the WatermelonDB/JSI
  // Android stability issue and the re-evaluation trigger. Must match
  // android/gradle.properties (newArchEnabled) and database.ts (jsi flag).
  newArchEnabled: false,

  // NOTE: these three colours are baked into the native project, so they are
  // duplicated from src/design-system/tokens.ts rather than imported — this
  // file is evaluated by the Expo CLI at build time, outside the app bundle.
  // If the palette moves, they move with it. A stale splash colour is not a
  // cosmetic detail: it is the first thing every launch shows.
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    // colors.surface.base
    backgroundColor: '#080B12',
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      // colors.surface.base
      backgroundColor: '#080B12',
    },
    package: getBundleId(),
    permissions: [
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
    ],
  },

  ios: {
    bundleIdentifier: getBundleId(),
    supportsTablet: false,
    infoPlist: {
      NSFaceIDUsageDescription: 'FinTrack uses Face ID to secure your financial data.',
      UIBackgroundModes: ['fetch', 'remote-notification'],
    },
  },

  plugins: [
    'expo-asset',
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-local-authentication',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        // colors.money.inbound. The previous value was the retired brand green,
        // which exists nowhere in the palette any more.
        color: '#46A883',
      },
    ],
    [
      'expo-background-fetch',
      {
        minimumInterval: 15 * 60,
      },
    ],
    // Strips the notification listener and the draw-over-other-apps permission
    // from anything that is not a development build. Both are unreachable in a
    // release build, and together they read as an overlay banking trojan —
    // which got the demo APK hard blocked by Play Protect. See the file.
    './plugins/withReleaseHardening',
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    apiUrl: getApiUrl(),
    appEnv: process.env.APP_ENV ?? 'development',
    sentryDsn: process.env.SENTRY_DSN ?? '',
    posthogApiKey: process.env.POSTHOG_API_KEY ?? '',
    posthogHost: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },

  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },

  runtimeVersion: '1.0.0',
});
