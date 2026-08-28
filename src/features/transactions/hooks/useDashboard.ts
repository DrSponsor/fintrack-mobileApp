/**
 * useDashboard — the month, summarised.
 *
 * ── Why this does not use /v1/analysis/monthly ───────────────────────────
 * That endpoint exists and returns exactly this shape. It also answers 202
 * PENDING and queues a worker whenever the report is stale, so the first
 * screen after login would open on a spinner waiting for a job — and in this
 * project `runWorkers` defaults to false, so the job is never consumed at all
 * and the report never arrives.
 *
 * A dashboard is the wrong place for an async recompute. It is read constantly,
 * must be instant, and must be right offline. So the month is derived here from
 * the transactions themselves, which also means the dashboard and the ledger
 * are reading ONE source and cannot disagree about what happened. The analysis
 * endpoint remains the right thing for the Analysis tab, where a multi-month
 * server-computed report and a loading state both make sense.
 *
 * ── Why the month is fetched whole ───────────────────────────────────────
 * Summarising "whatever the ledger happened to have loaded" would produce a
 * total that is silently short whenever the month runs past one page. A wrong
 * figure is worse than no figure in a finance app, so this reads the month as
 * its own bounded query and follows every page of it. The bound is the month,
 * so it always terminates — one request for a typical user.
 *
 * ── Balance is the bank's number, never ours ─────────────────────────────
 * Summing debits and credits would drift the moment anything happens that no
 * alert told us about. Accounts carry the balance the bank itself stated, so
 * that is what is shown, and null means genuinely unknown rather than zero.
 * See the note in the dashboard screen for why that distinction matters.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { readApiError } from '@/core/api/client';
import { RemoteLedgerRepository } from '@/core/repositories/ledger/RemoteLedgerRepository';
import { RemoteCaptureRepository } from '@/core/repositories/capture/RemoteCaptureRepository';
import type { ILedgerRepository, LedgerPage } from '@/core/repositories/ledger/ILedgerRepository';
import type { ICaptureRepository } from '@/core/repositories/capture/ICaptureRepository';
import type { AccountSummary } from '@/features/capture/types';
import type { LedgerEntry } from '../ledger';
import { ledgerKeys } from './useLedger';
import { summariseMonth, type CategorySlice } from '../summary';

/** Rows per request for the month window. The cap the API enforces. */
const MONTH_PAGE = 100;

/** Entries shown on the dashboard before "See all". */
export const RECENT_LIMIT = 4;

/** Category rows shown in the breakdown. Beyond this it stops being a glance. */
export const BREAKDOWN_LIMIT = 4;

export const dashboardKeys = {
  month: (key: string) => ['ledger', 'month', key] as const,
  accounts: ['ledger', 'accounts'] as const,
};

export interface DashboardSummary {
  readonly ready: boolean;
  readonly error: string | null;
  /** Null means genuinely unknown, never zero-as-unknown. */
  readonly balanceKobo: bigint | null;
  readonly accountCount: number;
  /** When the balance was last stated by a bank. */
  readonly asOf: Date | null;
  readonly inKobo: bigint;
  readonly outKobo: bigint;
  readonly entryCount: number;
  readonly breakdown: readonly CategorySlice[];
  readonly recent: readonly LedgerEntry[];
  readonly refreshing: boolean;
  readonly refresh: () => void;
}

function describe(err: unknown): string {
  const api = readApiError(err);
  if (api === null) return 'Could not reach the server. Pull to refresh when you are back online.';
  return api.message;
}

export function useDashboard(
  repo: ILedgerRepository = RemoteLedgerRepository,
  captureRepo: ICaptureRepository = RemoteCaptureRepository,
  now: Date = new Date(),
): DashboardSummary {
  // Local month boundaries, not UTC: a payment made at 9pm in Lagos belongs to
  // the month the person was living in, not the one the meridian was.
  //
  // `now` defaults to a fresh Date on every render, so it cannot be the
  // dependency — the window would be a new object each time and the query key
  // would churn. The month it falls in is the real input, so that is what is
  // computed first and depended on.
  const monthOf = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const window = useMemo(() => {
    const [year, month] = monthOf.split('-').map(Number);
    const from = new Date(year ?? 1970, (month ?? 1) - 1, 1, 0, 0, 0, 0);
    // End is the month's own end, not "now": a fixed window keeps the query
    // key and its cached result stable for the whole day instead of moving
    // every render.
    const to = new Date(year ?? 1970, month ?? 1, 1, 0, 0, 0, 0);
    return { key: monthOf, startDate: from.toISOString(), endDate: to.toISOString() };
  }, [monthOf]);

  const month = useInfiniteQuery({
    queryKey: dashboardKeys.month(window.key),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      repo.listTransactions(pageParam, MONTH_PAGE, {
        startDate: window.startDate,
        endDate: window.endDate,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: LedgerPage) => (last.hasMore ? last.cursor : undefined),
  });

  const accounts = useQuery({
    queryKey: dashboardKeys.accounts,
    queryFn: () => captureRepo.listAccounts(),
    staleTime: 60 * 60 * 1000,
  });

  const categories = useQuery({
    queryKey: ledgerKeys.categories,
    queryFn: () => repo.listCategories(),
    staleTime: 60 * 60 * 1000,
  });

  // Follow the month to its end. Bounded by the window, so it terminates —
  // one request for a typical user, more only for a very busy month.
  //
  // In an effect, never during render: fetchNextPage sets state, and calling
  // it while rendering is a side effect in the render phase. It also has to be
  // guarded on isFetchingNextPage, or every render while a page is in flight
  // queues another one.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = month;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const entries = useMemo(
    () => month.data?.pages.flatMap((page) => page.entries) ?? [],
    [month.data],
  );

  const names = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.displayName])),
    [categories.data],
  );

  const totals = useMemo(() => summariseMonth(entries, names), [entries, names]);

  const balance = useMemo(() => {
    const rows: readonly AccountSummary[] = accounts.data ?? [];
    if (rows.length === 0) return { balanceKobo: null, accountCount: 0 };
    // Every account the user holds, added together. An account whose bank has
    // not yet stated a balance contributes nothing and is not counted as zero.
    const known = rows.filter((a) => a.balanceKobo !== null && a.balanceKobo !== '');
    if (known.length === 0) return { balanceKobo: null, accountCount: rows.length };
    return {
      balanceKobo: known.reduce((sum, a) => sum + BigInt(a.balanceKobo), 0n),
      accountCount: rows.length,
    };
  }, [accounts.data]);

  // The most recent entry that a bank alert dated. Best available answer to
  // "how current is this figure".
  const asOf = useMemo(() => {
    const first = entries[0];
    return first !== undefined ? new Date(first.transactionDate) : null;
  }, [entries]);

  // react-query keeps refetch stable across renders, which is what lets this
  // be a dependency of the screen's focus effect without re-running it.
  const refetchMonth = month.refetch;
  const refetchAccounts = accounts.refetch;

  const refresh = useCallback(() => {
    void refetchMonth();
    void refetchAccounts();
  }, [refetchMonth, refetchAccounts]);

  const failure = month.error ?? accounts.error;

  return {
    ready: !month.isPending,
    error: failure != null ? describe(failure) : null,
    balanceKobo: balance.balanceKobo,
    accountCount: balance.accountCount,
    asOf,
    inKobo: totals.inKobo,
    outKobo: totals.outKobo,
    entryCount: entries.length,
    breakdown: totals.breakdown.slice(0, BREAKDOWN_LIMIT),
    recent: entries.slice(0, RECENT_LIMIT),
    refreshing: month.isRefetching && !isFetchingNextPage,
    refresh,
  };
}
