/**
 * MMKV Storage Instance
 *
 * For NON-SENSITIVE preferences only:
 * - Theme preference
 * - Balance visibility
 * - Onboarding completion flag
 * - Last active timestamp
 *
 * NEVER store tokens, passwords, or PII here.
 * Tokens → Keychain (TokenManager)
 * Sensitive data → EncryptionService + SecureStore
 */
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'fintrack-preferences',
});

/**
 * Zustand persist storage adapter for MMKV.
 * Used with Zustand's `persist` middleware.
 */
export const mmkvZustandStorage = {
  getItem: (name: string): string | null => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.delete(name);
  },
};
