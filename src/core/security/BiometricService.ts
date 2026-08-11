/**
 * Biometric Service
 *
 * Face ID / Fingerprint authentication via Expo Local Authentication.
 *
 * Two use cases:
 * 1. App lock: triggers after 5 minutes of background time
 * 2. Transaction confirmation: amounts > ₦50,000 require biometric
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { security } from '@/design-system/tokens';

export const BIOMETRIC_LOCK_TIMEOUT_MS = security.BIOMETRIC_LOCK_TIMEOUT_MS;
export const BIOMETRIC_CONFIRMATION_KOBO = security.BIOMETRIC_CONFIRMATION_KOBO;

export const BiometricService = {
  /**
   * Check if biometric hardware is available on this device.
   */
  async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  },

  /**
   * Get available biometric types (fingerprint, face, iris).
   */
  async getAvailableTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  },

  /**
   * Authenticate the user with biometrics.
   *
   * @param reason - Human-readable reason shown in the system prompt
   * @returns true if authentication succeeded
   */
  async authenticate(reason: string): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  },

  /**
   * Check if a transaction amount requires biometric confirmation.
   * Amounts above ₦50,000 (5,000,000 kobo) always require it.
   */
  requiresConfirmation(amountKobo: bigint): boolean {
    return amountKobo > BIOMETRIC_CONFIRMATION_KOBO;
  },

  /**
   * Check if the app should lock based on background time.
   *
   * @param lastActiveAt - Timestamp when app was last active
   * @returns true if the lock should engage
   */
  shouldLock(lastActiveAt: number | null): boolean {
    if (lastActiveAt === null) return true;
    const elapsed = Date.now() - lastActiveAt;
    return elapsed >= BIOMETRIC_LOCK_TIMEOUT_MS;
  },
};
