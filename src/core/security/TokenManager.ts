/**
 * Token Manager — OS Keychain Storage
 *
 * ALL tokens stored in the OS keychain via react-native-keychain.
 * NEVER in AsyncStorage. NEVER in MMKV. NEVER in Redux persist.
 *
 * AsyncStorage is plain text on disk. On a rooted device, a plain-text
 * token is readable by any other process. The keychain is encrypted
 * by the OS and requires device authentication to access.
 */
import * as Keychain from 'react-native-keychain';

const SERVICES = {
  accessToken: 'fintrack.access_token',
  refreshToken: 'fintrack.refresh_token',
  gmailToken: 'fintrack.gmail_token',
} as const;

const KEYCHAIN_OPTIONS: Keychain.SetOptions = {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const TokenManager = {
  // ── Access Token ─────────────────────────────────────────

  async getAccessToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICES.accessToken,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('fintrack', token, {
      ...KEYCHAIN_OPTIONS,
      service: SERVICES.accessToken,
    });
  },

  // ── Refresh Token ────────────────────────────────────────

  async getRefreshToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICES.refreshToken,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('fintrack', token, {
      ...KEYCHAIN_OPTIONS,
      service: SERVICES.refreshToken,
    });
  },

  // ── Gmail Token ──────────────────────────────────────────

  async getGmailToken(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SERVICES.gmailToken,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch {
      return null;
    }
  },

  async setGmailToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('fintrack', token, {
      ...KEYCHAIN_OPTIONS,
      service: SERVICES.gmailToken,
    });
  },

  // ── Utilities ────────────────────────────────────────────

  /** Clear all tokens — used on logout */
  async clearAll(): Promise<void> {
    await Promise.all([
      Keychain.resetGenericPassword({ service: SERVICES.accessToken }),
      Keychain.resetGenericPassword({ service: SERVICES.refreshToken }),
      Keychain.resetGenericPassword({ service: SERVICES.gmailToken }),
    ]);
  },

  /** Check if user has valid credentials stored */
  async hasCredentials(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  },
};
