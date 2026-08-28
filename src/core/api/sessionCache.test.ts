/**
 * Guards against one person being shown another person's money.
 *
 * The QueryClient is a module singleton and outlives a session. Before this,
 * signing into a second account rendered the first account's balance and
 * "Across 2 accounts" beneath the second account's own empty month, because
 * `accounts` is cached for an hour and its key said nothing about whose
 * accounts they were.
 *
 * Both defences are tested: the cache is emptied when the identity changes,
 * and the keys could not collide even if it were not.
 */
import { queryClient, installSessionCacheReset } from './queryClient';
import { useAuthStore, type AuthUser } from '@/core/store/auth.store';
import { ledgerKeys } from '@/features/transactions/hooks/useLedger';
import { dashboardKeys } from '@/features/transactions/hooks/useDashboard';
import { detailKeys } from '@/features/transactions/hooks/useTransactionDetail';
import { ANONYMOUS } from '@/features/transactions/hooks/useUserScope';

function user(id: string): AuthUser {
  return {
    id,
    email: `${id}@example.test`,
    tier: 'FREE',
    createdAt: '2026-08-01T00:00:00.000Z',
  };
}

describe('session cache reset', () => {
  let clear: jest.SpyInstance;
  let stop: () => void;

  beforeEach(() => {
    useAuthStore.getState().logout();
    clear = jest.spyOn(queryClient, 'clear').mockImplementation(() => {});
    stop = installSessionCacheReset();
  });

  afterEach(() => {
    stop();
    clear.mockRestore();
  });

  it('empties the cache when a different account signs in', () => {
    useAuthStore.getState().setUser(user('alice'));
    clear.mockClear();

    useAuthStore.getState().setUser(user('bob'));

    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('empties the cache on sign-out', () => {
    useAuthStore.getState().setUser(user('alice'));
    clear.mockClear();

    useAuthStore.getState().logout();

    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('does not empty the cache on unrelated state changes', () => {
    // The store is written for plenty of reasons that are not an identity
    // change — a tier upgrade, a loading flag. Clearing on those would throw
    // away good data and refetch the whole ledger for nothing.
    useAuthStore.getState().setUser(user('alice'));
    clear.mockClear();

    useAuthStore.getState().setLoading(true);
    useAuthStore.getState().setTier('PRO');

    expect(clear).not.toHaveBeenCalled();
  });

  it('does not empty the cache when the same account is re-set', () => {
    useAuthStore.getState().setUser(user('alice'));
    clear.mockClear();

    useAuthStore.getState().setUser(user('alice'));

    expect(clear).not.toHaveBeenCalled();
  });
});

describe('query keys are scoped per user', () => {
  // The structural half. Even with no clear at all, two accounts must not be
  // able to read each other's cached answers.
  it('gives two accounts different keys for the same question', () => {
    expect(ledgerKeys.transactions('alice')).not.toEqual(ledgerKeys.transactions('bob'));
    expect(dashboardKeys.accounts('alice')).not.toEqual(dashboardKeys.accounts('bob'));
    expect(dashboardKeys.month('alice', '2026-08')).not.toEqual(
      dashboardKeys.month('bob', '2026-08'),
    );
    expect(detailKeys.transaction('alice', 'tx-1')).not.toEqual(
      detailKeys.transaction('bob', 'tx-1'),
    );
  });

  it('treats signed-out as its own scope, not a shared one', () => {
    expect(dashboardKeys.accounts(ANONYMOUS)).not.toEqual(dashboardKeys.accounts('alice'));
  });

  it('invalidating one account does not match another account', () => {
    // react-query matches by key PREFIX, so this is what actually decides
    // whether an invalidation can reach across accounts.
    const alice = ledgerKeys.all('alice');
    const bobMonth = dashboardKeys.month('bob', '2026-08');

    const isPrefix = alice.every((part, i) => bobMonth[i] === part);
    expect(isPrefix).toBe(false);
  });

  it('keeps categories shared, because they belong to nobody', () => {
    // Global reference data. Scoping it would refetch a fixed list on every
    // account switch for no benefit.
    expect(ledgerKeys.categories).toEqual(['categories']);
  });
});
