/**
 * Keep two banking-trojan-shaped declarations out of non-development builds.
 *
 * ── What this removes, and why ───────────────────────────────────────────
 * Google Play Protect HARD BLOCKED the demo APK on a real device: "This app
 * can request access to sensitive data. This can increase the risk of identity
 * theft or financial fraud." Confirmed against the shipped artifact with
 * aapt2, not guessed at.
 *
 * The APK declared BIND_NOTIFICATION_LISTENER_SERVICE together with
 * SYSTEM_ALERT_WINDOW. Read together — permission to read every notification
 * on the device, one-time passcodes included, plus permission to draw over
 * other apps — that is the exact signature of an Android overlay banking
 * trojan, on an app whose name and icon say it handles money.
 *
 * Neither is reachable in a release build:
 *
 *   - The notification listener comes from modules/notification-capture, and
 *     its only consumer is CaptureDebugScreen, linked solely under __DEV__.
 *     A release build was claiming the right to read every notification on the
 *     phone in order to power a screen nobody can open.
 *   - SYSTEM_ALERT_WINDOW is contributed by React Native for the dev menu and
 *     the redbox overlay. Nothing in a release build uses it.
 *
 * ── Why a config plugin, and not a release source set ────────────────────
 * The obvious Android answer is android/app/src/release/AndroidManifest.xml,
 * which Gradle merges for release variants only. That was tried and did
 * nothing at all: `.easignore` excludes /android, so EAS runs `expo prebuild`
 * and regenerates the native project from app.config.ts. The committed
 * android/ directory is stale and never reaches the build — the source set was
 * excluded from the upload, and the rebuilt APK's manifest came back
 * byte-identical.
 *
 * Anything that must survive to a build has to go through prebuild. That means
 * here.
 *
 * ── Why tools:node="remove" rather than deleting elements ────────────────
 * The service is contributed by a LIBRARY manifest (the local Expo module), so
 * at prebuild time there is no element in the app manifest to delete — it does
 * not exist yet. It is merged in later, by Gradle. A higher-priority manifest
 * removes a library's contribution by marking it, which is what this writes.
 *
 * SYSTEM_ALERT_WINDOW is handled both ways: any literal declaration is dropped
 * from the app manifest AND the removal marker is added, so it goes whether it
 * arrived from a plugin or from a library.
 *
 * ── When to delete this file ─────────────────────────────────────────────
 * If notification capture becomes a real product feature — plausible, since
 * the banks have gone quiet on email — the service block below comes out. The
 * permission then needs a user-visible purpose, a consent flow, and a
 * justification at Play review. It should not come back silently as a side
 * effect of a debug screen.
 */
const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const TOOLS_NAMESPACE = 'http://schemas.android.com/tools';

/** The notification listener contributed by modules/notification-capture. */
const LISTENER_SERVICE = 'expo.modules.notificationcapture.NotificationCaptureService';

/** Draw-over-other-apps, contributed by React Native's dev support. */
const OVERLAY_PERMISSION = 'android.permission.SYSTEM_ALERT_WINDOW';

/**
 * `tools:` is only usable if the manifest root declares the namespace. A bare
 * `tools:node` attribute without it is a build failure, not a no-op, so this
 * must run before anything below writes one.
 */
function ensureToolsNamespace(manifest) {
  manifest.$ = manifest.$ ?? {};
  manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? TOOLS_NAMESPACE;
}

function removeOverlayPermission(manifest) {
  const declared = manifest['uses-permission'] ?? [];

  // Drop any literal declaration first. Leaving it in place alongside the
  // marker below would put two elements with the same android:name in one
  // manifest, which the merger treats as a conflict rather than a removal.
  const kept = declared.filter((entry) => entry.$?.['android:name'] !== OVERLAY_PERMISSION);

  kept.push({
    $: {
      'android:name': OVERLAY_PERMISSION,
      'tools:node': 'remove',
    },
  });

  manifest['uses-permission'] = kept;
}

function removeListenerService(manifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow({ manifest });
  const services = application.service ?? [];

  const kept = services.filter((entry) => entry.$?.['android:name'] !== LISTENER_SERVICE);

  kept.push({
    $: {
      'android:name': LISTENER_SERVICE,
      'tools:node': 'remove',
    },
  });

  application.service = kept;
}

const withReleaseHardening = (config) => {
  // Development builds keep both: the dev client needs the overlay for its
  // redbox, and the capture inspector is the whole reason the module exists.
  if (process.env.APP_ENV === 'development') {
    return config;
  }

  return withAndroidManifest(config, (mod) => {
    const { manifest } = mod.modResults;

    ensureToolsNamespace(manifest);
    removeOverlayPermission(manifest);
    removeListenerService(manifest);

    return mod;
  });
};

module.exports = withReleaseHardening;
