/**
 * Root / Jailbreak Detection — Fraud Signal
 *
 * Root detection is a DETERRENT, not a GUARANTEE.
 * Tools like Magisk Hide bypass most detection libraries.
 *
 * Correct mental model: root detection is a FRAUD SIGNAL logged
 * server-side, not a security barrier. Flag the account, limit
 * high-risk operations, alert the fraud team — but do not present
 * this as bank-grade security, because it isn't.
 */
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import JailMonkey from 'jail-monkey';
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const RootDetection = {
  /**
   * Check if the device appears to be rooted/jailbroken.
   * Returns true if ANY indicator is detected.
   *
   * Note: This is best-effort. A determined attacker can bypass this.
   * `JailMonkey.isJailBroken()` runs RootBeer's checks on Android
   * (su binary, root-management apps, dangerous props, Magisk binary,
   * etc.) and the standard jailbreak file/path checks on iOS.
   * `!Device.isDevice` (running in an emulator/simulator) is combined
   * as an additional signal — real users run on real hardware.
   */
  async isDeviceCompromised(): Promise<boolean> {
    try {
      const isEmulator = !Device.isDevice;
      const isJailBroken = JailMonkey.isJailBroken();

      return isEmulator || isJailBroken;
    } catch {
      // If detection itself fails, treat as suspicious — a broken
      // detector is not evidence of a clean device.
      return true;
    }
  },

  /**
   * Log a security event to the server.
   * Called on app launch and before high-risk operations.
   */
  async reportToServer(deviceInfo: Record<string, unknown>): Promise<void> {
    try {
      await api.post(endpoints.security.events, {
        type: 'rooted_device',
        platform: Platform.OS,
        ...deviceInfo,
      });
    } catch {
      // Security reporting failure must not crash the app
      // Silently fail — the next launch will try again
    }
  },

  /**
   * Full check: detect + report if compromised.
   * Called from the root layout on app startup.
   */
  async checkAndReport(): Promise<boolean> {
    const isCompromised = await this.isDeviceCompromised();

    if (isCompromised) {
      await this.reportToServer({
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        osVersion: Device.osVersion,
        detectedAt: new Date().toISOString(),
      });
    }

    return isCompromised;
  },
};
