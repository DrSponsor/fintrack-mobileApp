/**
 * TokenManager tests use a stateful in-memory mock of react-native-keychain
 * (a native module — the real thing can't run under Jest) so we can verify
 * genuine round-trip behavior: write → read → clear → read returns null.
 *
 * This also covers the dependency the LoginUseCase/RegisterUseCase
 * token-rollback fix relies on: TokenManager.clearAll() must actually
 * remove a token that was just written, for every token service.
 */
jest.mock('react-native-keychain', () => {
  const store = new Map<string, string>();
  return {
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly' },
    setGenericPassword: jest.fn(
      async (_username: string, password: string, options: { service: string }) => {
        store.set(options.service, password);
        return { service: options.service, storage: 'keychain' };
      },
    ),
    getGenericPassword: jest.fn(async (options: { service: string }) => {
      const password = store.get(options.service);
      if (password === undefined) return false;
      return { username: 'fintrack', password, service: options.service, storage: 'keychain' };
    }),
    resetGenericPassword: jest.fn(async (options: { service: string }) => {
      store.delete(options.service);
      return true;
    }),
  };
});

import { TokenManager } from './TokenManager';

describe('TokenManager', () => {
  afterEach(async () => {
    await TokenManager.clearAll();
  });

  it('returns null for a token that was never set', async () => {
    expect(await TokenManager.getAccessToken()).toBeNull();
    expect(await TokenManager.getRefreshToken()).toBeNull();
    expect(await TokenManager.getGmailToken()).toBeNull();
  });

  it('round-trips the access token: write then read returns the same value', async () => {
    await TokenManager.setAccessToken('access-abc123');
    expect(await TokenManager.getAccessToken()).toBe('access-abc123');
  });

  it('round-trips the refresh token independently of the access token', async () => {
    await TokenManager.setAccessToken('access-abc123');
    await TokenManager.setRefreshToken('refresh-xyz789');

    expect(await TokenManager.getAccessToken()).toBe('access-abc123');
    expect(await TokenManager.getRefreshToken()).toBe('refresh-xyz789');
  });

  it('round-trips the Gmail token', async () => {
    await TokenManager.setGmailToken('gmail-token-1');
    expect(await TokenManager.getGmailToken()).toBe('gmail-token-1');
  });

  it('clearAll removes every token — the path the login/register rollback fix depends on', async () => {
    await TokenManager.setAccessToken('access-abc123');
    await TokenManager.setRefreshToken('refresh-xyz789');
    await TokenManager.setGmailToken('gmail-token-1');

    await TokenManager.clearAll();

    expect(await TokenManager.getAccessToken()).toBeNull();
    expect(await TokenManager.getRefreshToken()).toBeNull();
    expect(await TokenManager.getGmailToken()).toBeNull();
  });

  describe('hasCredentials', () => {
    it('is false when no access token is stored', async () => {
      expect(await TokenManager.hasCredentials()).toBe(false);
    });

    it('is true once an access token is stored', async () => {
      await TokenManager.setAccessToken('access-abc123');
      expect(await TokenManager.hasCredentials()).toBe(true);
    });

    it('is false again after clearAll', async () => {
      await TokenManager.setAccessToken('access-abc123');
      await TokenManager.clearAll();
      expect(await TokenManager.hasCredentials()).toBe(false);
    });
  });
});
