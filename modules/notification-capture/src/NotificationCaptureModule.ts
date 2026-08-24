import { NativeModule, requireNativeModule } from 'expo';
import { Platform } from 'react-native';

/** One captured notification, as the native listener flattened it. */
export interface CapturedAlert {
  /** e.g. "team.opay.pay" — the stable identity to match a bank on. */
  readonly packageName: string;
  /** e.g. "Opay" — for display only; users rename nothing but read this. */
  readonly appLabel: string;
  readonly title: string;
  /** Body text, preferring the expanded form over the truncated one. */
  readonly text: string;
  readonly subText: string;
  /** Epoch milliseconds. */
  readonly postedAt: number;
}

/**
 * A type alias, NOT an interface. `NativeModule<T>` constrains T to Expo's
 * `EventsMap`, which is an index-signature type — and an interface does not get
 * an implicit index signature, so `interface CaptureEvents {…}` fails to
 * satisfy the constraint while an identical type alias satisfies it.
 */
type CaptureEvents = {
  onAlert: (alert: CapturedAlert) => void;
};

declare class NotificationCaptureNativeModule extends NativeModule<CaptureEvents> {
  /** Whether the user has granted notification-listener access. */
  hasAccess(): boolean;
  /** Opens the system settings screen where access is granted. */
  requestAccess(): void;
  /** Returns everything captured since the last call and empties the buffer. */
  drain(): CapturedAlert[];
}

/**
 * Android-only. iOS has no equivalent of NotificationListenerService — reading
 * other apps' notifications is not possible there at any privilege level, which
 * is a product constraint rather than a gap to fill later.
 *
 * Resolved lazily and defensively: `requireNativeModule` THROWS when the native
 * side is absent, so a bare call at import time would crash the whole JS bundle
 * on iOS, in Expo Go, or in any build predating this module — turning a missing
 * feature into a dead app.
 */
function resolve(): NotificationCaptureNativeModule | null {
  if (Platform.OS !== 'android') return null;
  try {
    return requireNativeModule<NotificationCaptureNativeModule>('NotificationCapture');
  } catch {
    return null;
  }
}

const nativeModule = resolve();

/** Whether alert capture can work at all on this device and build. */
export const isCaptureSupported: boolean = nativeModule !== null;

export function hasAccess(): boolean {
  return nativeModule?.hasAccess() ?? false;
}

export function requestAccess(): void {
  nativeModule?.requestAccess();
}

export function drain(): CapturedAlert[] {
  return nativeModule?.drain() ?? [];
}

export function addAlertListener(handler: (alert: CapturedAlert) => void): () => void {
  const subscription = nativeModule?.addListener('onAlert', handler);
  return () => subscription?.remove();
}
