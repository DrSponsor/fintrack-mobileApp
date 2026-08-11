/**
 * Encryption Service
 *
 * Provides cryptographic operations for local data encryption.
 * Stores a master encryption key securely in Expo SecureStore (hardware-backed).
 * Uses the standard WebCrypto API (standard in React Native 0.76+) for high-performance
 * AES-GCM encryption/decryption of sensitive payloads.
 */
import * as SecureStore from 'expo-secure-store';

const MASTER_KEY_ALIAS = 'fintrack.master_encryption_key';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Helper to convert array buffer to base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

// Helper to convert base64 to array buffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper to convert string to array buffer
function stringToBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

// Helper to convert array buffer to string
function bufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

let cachedKey: CryptoKey | null = null;

async function getOrCreateMasterKey(): Promise<CryptoKey> {
  if (cachedKey) {
    return cachedKey;
  }

  // 1. Try to load the raw key bytes from SecureStore
  let rawKeyBase64 = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);

  if (!rawKeyBase64) {
    // 2. Generate a new cryptographic key if none exists
    const key = await global.crypto.subtle.generateKey(
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    // 3. Export and save the raw key bytes to SecureStore
    const exportedRaw = await global.crypto.subtle.exportKey('raw', key);
    rawKeyBase64 = bufferToBase64(exportedRaw);
    await SecureStore.setItemAsync(MASTER_KEY_ALIAS, rawKeyBase64, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    cachedKey = key;
    return key;
  }

  // 4. Import the saved key bytes back into a CryptoKey object
  const rawKeyBuffer = base64ToBuffer(rawKeyBase64);
  const key = await global.crypto.subtle.importKey(
    'raw',
    rawKeyBuffer,
    ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  );

  cachedKey = key;
  return key;
}

export const EncryptionService = {
  /**
   * Encrypt a sensitive text payload using AES-GCM 256.
   * Returns a base64 encoded JSON string containing ciphertext and IV.
   */
  async encrypt(plainText: string): Promise<string> {
    try {
      const key = await getOrCreateMasterKey();
      
      // Generate a 12-byte random initialization vector (IV)
      const iv = global.crypto.getRandomValues(new Uint8Array(12));
      const dataBuffer = stringToBuffer(plainText);

      const encryptedBuffer = await global.crypto.subtle.encrypt(
        {
          name: ALGORITHM,
          iv: iv,
        },
        key,
        dataBuffer
      );

      const payload = {
        ciphertext: bufferToBase64(encryptedBuffer),
        iv: bufferToBase64(iv.buffer),
      };

      return JSON.stringify(payload);
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Decrypt a ciphertext payload using AES-GCM 256.
   */
  async decrypt(encryptedJson: string): Promise<string> {
    try {
      const key = await getOrCreateMasterKey();
      const payload = JSON.parse(encryptedJson) as { ciphertext: string; iv: string };

      if (!payload.ciphertext || !payload.iv) {
        throw new Error('Invalid encrypted payload format');
      }

      const encryptedBuffer = base64ToBuffer(payload.ciphertext);
      const ivBuffer = base64ToBuffer(payload.iv);

      const decryptedBuffer = await global.crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv: new Uint8Array(ivBuffer),
        },
        key,
        encryptedBuffer
      );

      return bufferToString(decryptedBuffer);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Clear the encryption key from SecureStore.
   * WARNING: Any data encrypted with this key will become permanently unreadable!
   */
  async clearKey(): Promise<void> {
    await SecureStore.deleteItemAsync(MASTER_KEY_ALIAS);
    cachedKey = null;
  },
};
