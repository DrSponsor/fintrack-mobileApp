/**
 * The idempotency key is what these tests are really about.
 *
 * Everything else here is plumbing; the key is the difference between a
 * flaky network retry being harmless and it charging the user twice. Its two
 * requirements pull in opposite directions — stable across retries of one
 * submission, fresh for a genuinely new one — so each is pinned separately.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react-native';
import { useManualEntry } from './useManualEntry';
import type { ICaptureRepository } from '@/core/repositories/capture/ICaptureRepository';
import type { CapturedTransaction, ManualCaptureResult, ManualEntryPayload } from '../types';

const PAYLOAD: ManualEntryPayload = {
  accountId: '11111111-1111-4111-8111-111111111111',
  amountKobo: '500000',
  type: 'DEBIT',
  merchantName: 'Shoprite',
  transactionDate: '2026-08-20T14:30:00.000Z',
};

function makeTransaction(overrides: Partial<CapturedTransaction> = {}): CapturedTransaction {
  return {
    id: 'tx-1',
    accountId: PAYLOAD.accountId,
    amountKobo: '500000',
    type: 'DEBIT',
    merchantName: 'Shoprite',
    categoryId: 'cat-1',
    transactionDate: PAYLOAD.transactionDate,
    source: 'MANUAL',
    isVerified: false,
    providerRef: null,
    transferGroupId: null,
    createdAt: PAYLOAD.transactionDate,
    ...overrides,
  };
}

const recorded: ManualCaptureResult = { outcome: 'recorded', transaction: makeTransaction() };

function makeRepo(overrides: Partial<ICaptureRepository> = {}): ICaptureRepository {
  return {
    createManualEntry: jest.fn().mockResolvedValue(recorded),
    listAccounts: jest.fn().mockResolvedValue([]),
    listCategories: jest.fn().mockResolvedValue([]),
    deleteTransaction: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** The key each call was made with, in order. */
function keysUsed(repo: ICaptureRepository): string[] {
  return (repo.createManualEntry as jest.Mock).mock.calls.map((call) => call[1] as string);
}

/**
 * The hook invalidates the ledger cache on a recorded entry, so it needs a
 * QueryClient in scope. A fresh one per test — a shared client would carry
 * one test's invalidation into the next.
 */
let client: QueryClient;
let wrapper: React.FC<{ children: React.ReactNode }>;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  wrapper = ({ children }) => React.createElement(QueryClientProvider, { client }, children);
});

describe('useManualEntry', () => {
  it('returns the created transaction', async () => {
    const repo = makeRepo();
    const { result } = renderHook(() => useManualEntry(repo), { wrapper });

    let created: CapturedTransaction | null = null;
    await act(async () => {
      created = await result.current.submit(PAYLOAD);
    });

    expect(created).toEqual(recorded.transaction);
    expect(result.current.duplicate).toBeNull();
  });

  it('reuses the same key when a failed submission is retried', async () => {
    // The whole point of the mechanism. A request that times out has an unknown
    // outcome — the money may already be recorded — so the retry must be
    // recognisable as the same submission rather than a new one.
    const repo = makeRepo({
      createManualEntry: jest
        .fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce(recorded),
    });
    const { result } = renderHook(() => useManualEntry(repo), { wrapper });

    await act(async () => {
      await result.current.submit(PAYLOAD);
    });
    await act(async () => {
      await result.current.submit(PAYLOAD);
    });

    const [first, second] = keysUsed(repo);
    expect(first).toBe(second);
  });

  it('mints a fresh key for a submission after a successful one', async () => {
    const repo = makeRepo();
    const { result } = renderHook(() => useManualEntry(repo), { wrapper });

    await act(async () => {
      await result.current.submit(PAYLOAD);
    });
    await act(async () => {
      await result.current.submit(PAYLOAD);
    });

    const [first, second] = keysUsed(repo);
    expect(first).not.toBe(second);
  });

  it('says the entry was not saved when the server was never reached', async () => {
    // Distinct from a server rejection: it tells the user to retry rather than
    // to re-enter, and those lead to opposite actions.
    const repo = makeRepo({ createManualEntry: jest.fn().mockRejectedValue(new Error('timeout')) });
    const { result } = renderHook(() => useManualEntry(repo), { wrapper });

    await act(async () => {
      await result.current.submit(PAYLOAD);
    });

    expect(result.current.error).toContain('Nothing has been saved');
  });

  describe('telling the rest of the app the ledger changed', () => {
    // Without this, a saved entry left the dashboard showing the month and
    // balance it had cached beforehand, and only a pull-to-refresh revealed
    // it. A first-time user has no reason to know to do that — the app looks
    // like it ignored what they just recorded.
    function invalidatedKeys(spy: jest.SpyInstance): unknown[] {
      return spy.mock.calls.map((call) => (call[0] as { queryKey: unknown }).queryKey);
    }

    it('invalidates the ledger tree once the entry is recorded', async () => {
      const repo = makeRepo();
      const spy = jest.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useManualEntry(repo), { wrapper });

      await act(async () => {
        await result.current.submit(PAYLOAD);
      });

      // The PREFIX, not one leaf. The dashboard's month window, its accounts
      // query and the ledger list all hang off it, and React Query matches
      // invalidation by prefix — so this one call reaches all three.
      expect(invalidatedKeys(spy)).toContainEqual(['ledger', 'anonymous']);
    });

    it('does not invalidate while the duplicate question is unanswered', async () => {
      // Nothing was written, so nothing downstream changed. Refetching here
      // would be a pointless round trip on a screen that is mid-question.
      const repo = makeRepo({
        createManualEntry: jest.fn().mockResolvedValue({
          outcome: 'already-recorded',
          transaction: makeTransaction({ id: 'existing-1' }),
          reason: 'already captured',
        } satisfies ManualCaptureResult),
      });
      const spy = jest.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useManualEntry(repo), { wrapper });

      await act(async () => {
        await result.current.submit(PAYLOAD);
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('does not invalidate when the entry failed to save', async () => {
      const repo = makeRepo({ createManualEntry: jest.fn().mockRejectedValue(new Error('timeout')) });
      const spy = jest.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useManualEntry(repo), { wrapper });

      await act(async () => {
        await result.current.submit(PAYLOAD);
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('the duplicate question', () => {
    const duplicate: ManualCaptureResult = {
      outcome: 'already-recorded',
      transaction: makeTransaction({ id: 'existing-1', source: 'EMAIL' }),
      reason: 'already captured from your bank alert 20 minutes apart',
    };

    it('raises the question instead of returning a transaction', async () => {
      const repo = makeRepo({ createManualEntry: jest.fn().mockResolvedValue(duplicate) });
      const { result } = renderHook(() => useManualEntry(repo), { wrapper });

      let created: CapturedTransaction | null = makeTransaction();
      await act(async () => {
        created = await result.current.submit(PAYLOAD);
      });

      expect(created).toBeNull();
      expect(result.current.duplicate).not.toBeNull();
      // The colliding row travels with it — the sheet has to show WHICH payment.
      expect(result.current.duplicate?.existing.id).toBe('existing-1');
      expect(result.current.duplicate?.certainty).toBe('already-recorded');
    });

    it('re-sends with force AND a fresh key when the user records anyway', async () => {
      // A fresh key is mandatory here. The server caches its answer against the
      // key, so replaying the old one would replay "duplicate suspected" and the
      // user's decision would silently do nothing.
      const repo = makeRepo({
        createManualEntry: jest
          .fn()
          .mockResolvedValueOnce(duplicate)
          .mockResolvedValueOnce(recorded),
      });
      const { result } = renderHook(() => useManualEntry(repo), { wrapper });

      await act(async () => {
        await result.current.submit(PAYLOAD);
      });
      await act(async () => {
        await result.current.recordAnyway();
      });

      const calls = (repo.createManualEntry as jest.Mock).mock.calls;
      expect(calls[1]?.[0]).toEqual({ ...PAYLOAD, force: true });

      const [first, second] = keysUsed(repo);
      expect(first).not.toBe(second);
      expect(result.current.duplicate).toBeNull();
    });

    it('does not force anything when the user backs out', async () => {
      const repo = makeRepo({ createManualEntry: jest.fn().mockResolvedValue(duplicate) });
      const { result } = renderHook(() => useManualEntry(repo), { wrapper });

      await act(async () => {
        await result.current.submit(PAYLOAD);
      });
      act(() => {
        result.current.dismissDuplicate();
      });

      expect(result.current.duplicate).toBeNull();
      expect(repo.createManualEntry).toHaveBeenCalledTimes(1);
    });
  });
});
