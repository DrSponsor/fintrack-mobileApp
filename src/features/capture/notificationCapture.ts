/**
 * The single place that reaches outside `src/` into the local Expo module.
 *
 * `modules/` sits beside `src/` rather than inside it — that is where Expo
 * autolinks local modules from, and it is why the native code survives
 * `expo prebuild --clean` instead of being regenerated away. But it means no
 * `@/…` alias covers it.
 *
 * Rather than add a resolver alias — which has to be taught to TypeScript,
 * Babel and Metro separately, and silently breaks the bundler when one of the
 * three disagrees — the relative path is written exactly once, here. Everything
 * else imports from `@/features/capture`.
 */
export {
  addAlertListener,
  drain,
  hasAccess,
  isCaptureSupported,
  requestAccess,
  type CapturedAlert,
} from '../../../modules/notification-capture/src/NotificationCaptureModule';
