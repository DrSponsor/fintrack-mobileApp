/**
 * useTransactionDetail — one entry, and the ability to re-file it.
 *
 * ── Why this reads the transaction again ─────────────────────────────────
 * The row is already in the list's cache, and rendering from it would be one
 * fewer request. But a merchant-scoped correction rewrites rows the list is
 * still holding, so the cached copy can be stale in exactly the situation this
 * screen exists to create. Reading it fresh costs one request and removes a
 * whole class of "I changed it and it changed back" reports.
 *
 * ── What a correction has to invalidate ──────────────────────────────────
 * Both queries, always. A single-transaction correction changes one row, but a
 * merchant-scoped one silently rewrites every earlier payment to that
 * counterparty — which is most of the point — and those rows are on the list
 * behind this screen. Invalidating only this transaction would leave the user
 * looking at a ledger that disagrees with the change they just made.
 */
import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readApiError } from '@/core/api/client';
import { RemoteLedgerRepository } from '@/core/repositories/ledger/RemoteLedgerRepository';
import { RemoteCaptureRepository } from '@/core/repositories/capture/RemoteCaptureRepository';
import type {
  ILedgerRepository,
  CorrectionScope,
  CorrectionResult,
} from '@/core/repositories/ledger/ILedgerRepository';
import type { ICaptureRepository } from '@/core/repositories/capture/ICaptureRepository';
import type { AccountSummary, CategorySummary } from '@/features/capture/types';
import type { LedgerEntry } from '../ledger';
import { ledgerKeys } from './useLedger';
import { dashboardKeys } from './useDashboard';
import { useUserScope } from './useUserScope';

export const detailKeys = {
  transaction: (user: string, id: string) => ['ledger', user, 'transaction', id] as const,
};

export interface UseTransactionDetailResult {
  readonly entry: LedgerEntry | undefined;
  readonly categories: readonly CategorySummary[];
  readonly account: AccountSummary | undefined;
  readonly loading: boolean;
  readonly error: string | null;
  /** Set while a correction is in flight, so the screen can hold the control. */
  readonly correcting: boolean;
  /** What the last correction actually reached. Cleared when the user dismisses it. */
  readonly lastCorrection: CorrectionResult | null;
  readonly correct: (categoryId: string, scope: CorrectionScope) => void;
  /** Moves a typed entry. Only offered when canMoveDate is true. */
  readonly correctDate: (at: Date) => void;
  /** True only for a typed entry no bank alert has confirmed. */
  readonly canMoveDate: boolean;
  readonly movingDate: boolean;
  readonly acknowledge: () => void;
  readonly retry: () => void;
}

function describe(err: unknown): string {
  const api = readApiError(err);
  if (api === null) return 'Could not reach the server. Check your connection and try again.';
  return api.message;
}

export function useTransactionDetail(
  id: string,
  repo: ILedgerRepository = RemoteLedgerRepository,
  captureRepo: ICaptureRepository = RemoteCaptureRepository,
): UseTransactionDetailResult {
  const user = useUserScope();
  const queryClient = useQueryClient();

  const transaction = useQuery({
    queryKey: detailKeys.transaction(user, id),
    queryFn: () => repo.getTransaction(id),
    enabled: id.length > 0,
  });

  const categories = useQuery({
    queryKey: ledgerKeys.categories,
    queryFn: () => repo.listCategories(),
    staleTime: 60 * 60 * 1000,
  });

  const accounts = useQuery({
    queryKey: dashboardKeys.accounts(user),
    queryFn: () => captureRepo.listAccounts(),
    staleTime: 60 * 60 * 1000,
  });

  const correction = useMutation({
    mutationFn: (input: { categoryId: string; scope: CorrectionScope }) =>
      repo.correctCategory(id, input.categoryId, input.scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: detailKeys.transaction(user, id) });
      void queryClient.invalidateQueries({ queryKey: ledgerKeys.all(user) });
    },
  });

  const dateCorrection = useMutation({
    mutationFn: (at: Date) => repo.correctDate(id, at),
    onSuccess: () => {
      // The ledger sorts on this, the dashboard’s balance counts entries
      // after the bank’s last stated figure, and the month it belongs to may
      // have changed. Everything that reads a date has to be re-read.
      void queryClient.invalidateQueries({ queryKey: detailKeys.transaction(user, id) });
      void queryClient.invalidateQueries({ queryKey: ledgerKeys.all(user) });
      void queryClient.invalidateQueries({ queryKey: ['ledger', user, 'accounts'] });
    },
  });

  const entry = transaction.data;

  const account = useMemo(
    () => (accounts.data ?? []).find((a) => a.id === entry?.accountId),
    [accounts.data, entry?.accountId],
  );

  const { mutate, reset } = correction;

  const correct = useCallback(
    (categoryId: string, scope: CorrectionScope) => {
      mutate({ categoryId, scope });
    },
    [mutate],
  );

  const { mutate: moveDate } = dateCorrection;

  const correctDate = useCallback((at: Date) => moveDate(at), [moveDate]);

  // The rule the server enforces, stated here so the screen can offer the
  // action only when it would succeed rather than surfacing a refusal.
  const canMoveDate = entry?.source === 'MANUAL' && entry.isVerified === false;

  const acknowledge = useCallback(() => {
    reset();
  }, [reset]);

  const retry = useCallback(() => {
    void transaction.refetch();
  }, [transaction]);

  // The transaction is the only query worth blocking on. Categories and
  // accounts resolve names, and a screen that renders the money immediately
  // and fills in "Access Bank ···· 0117" a moment later is better than one
  // that shows nothing until every lookup has landed.
  const failure = transaction.error ?? correction.error;

  return {
    entry,
    categories: categories.data ?? [],
    account,
    loading: transaction.isPending,
    error: failure != null ? describe(failure) : null,
    correcting: correction.isPending,
    lastCorrection: correction.data ?? null,
    correct,
    correctDate,
    canMoveDate,
    movingDate: dateCorrection.isPending,
    acknowledge,
    retry,
  };
}
