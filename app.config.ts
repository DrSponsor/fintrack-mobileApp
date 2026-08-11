import type { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_STAGING = process.env.APP_ENV === 'staging';
const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID ?? '6e6f1650-a353-499f-91de-6f3776daf3fc';

const getApiUrl = (): string => {
  if (IS_DEV) return 'http://10.0.2.2:3000'; // Android emulator → host machine
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
  newArchEnabled: true,

  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0F0F11',
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0F0F11',
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
        color: '#1D9E75',
      },
    ],
    [
      'expo-background-fetch',
      {
        minimumInterval: 15 * 60,
      },
    ],
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
