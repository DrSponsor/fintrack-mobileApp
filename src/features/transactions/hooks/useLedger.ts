/**
 * useLedger — paged reads for the transaction list.
 *
 * ── Why this is not hand-rolled ──────────────────────────────────────────
 * The first version of this file carried a generation counter, an in-flight
 * ref, a mounted ref and an id-set to filter duplicates across pages. All four
 * were there for real reasons — pulling to refresh mid-page must not append
 * the stale page, a response arriving after unmount must not set state, a row
 * recorded while scrolling shifts every later row so the next page re-sends
 * one already on screen — and all four are things useInfiniteQuery already
 * does. Hand-written concurrency is where the subtle bugs live, and the
 * library was already in package.json.
 *
 * What is left below is only the part that is specific to this app.
 *
 * ── The one thing worth reading carefully ────────────────────────────────
 * `select` runs on every render, so the grouping is memoised on the pages
 * rather than done inside it. Grouping 500 rows on every keystroke elsewhere
 * in the tree would be a real cost on the low-end Android this has to run on.
 */
import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { readApiError } from '@/core/api/client';
import { RemoteLedgerRepository } from '@/core/repositories/ledger/RemoteLedgerRepository';
import type { ILedgerRepository, LedgerPage } from '@/core/repositories/ledger/ILedgerRepository';
import { groupByDay, type LedgerItem } from '../ledger';
import { useUserScope } from './useUserScope';

export type LedgerStatus = 'loading' | 'ready' | 'error';

// Keyed by user. See useUserScope for why an unscoped key is a money leak
// rather than a staleness bug.
export const ledgerKeys = {
  all: (user: string) => ['ledger', user] as const,
  transactions: (user: string) => ['ledger', user, 'transactions'] as const,
  /** Categories are global reference data, not one user's — deliberately
   *  shared, so switching accounts does not refetch a fixed list. */
  categories: ['categories'] as const,
};

export interface UseLedgerResult {
  readonly items: readonly LedgerItem[];
  readonly status: LedgerStatus;
  /** Present only when something failed. Already phrased for a person. */
  readonly error: string | null;
  readonly refreshing: boolean;
  readonly loadingMore: boolean;
  readonly hasMore: boolean;
  /** Category name for a transaction's categoryId, or undefined if unknown. */
  readonly categoryName: (id: string) => string | undefined;
  readonly refresh: () => void;
  readonly loadMore: () => void;
}

/**
 * Turns a failure into something worth reading.
 *
 * A request that never reached the server is a genuinely different situation
 * from one the server refused, and the two lead a person to do opposite
 * things — wait and retry, or stop and check something. Saying "something went
 * wrong" for both is what makes an app feel broken rather than honest.
 */
function describe(err: unknown): string {
  const api = readApiError(err);
  if (api === null) return 'Could not reach the server. Check your connection and pull to refresh.';
  return api.message;
}

export function useLedger(repo: ILedgerRepository = RemoteLedgerRepository): UseLedgerResult {
  const user = useUserScope();

  const pages = useInfiniteQuery({
    queryKey: ledgerKeys.transactions(user),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => repo.listTransactions(pageParam),
    initialPageParam: undefined as string | undefined,
    // Returning undefined is how the library is told there is nothing after
    // this page, which is also what disables further fetching. Both conditions
    // matter: a server that reports hasMore but sends no cursor would
    // otherwise refetch the same page forever.
    getNextPageParam: (last: LedgerPage) => (last.hasMore ? last.cursor : undefined),
  });

  const categories = useQuery({
    queryKey: ledgerKeys.categories,
    queryFn: () => repo.listCategories(),
    // The set changes when the product ships a new category, not while
    // somebody is scrolling.
    staleTime: 60 * 60 * 1000,
  });

  const entries = useMemo(
    () => pages.data?.pages.flatMap((page) => page.entries) ?? [],
    [pages.data],
  );

  const items = useMemo(() => groupByDay(entries), [entries]);

  // displayName, not name. `name` is the slug the backend matches on, and
  // putting it on a row is how "airtime-data" ended up in front of a user.
  const names = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.displayName])),
    [categories.data],
  );

  const categoryName = useCallback((id: string) => names.get(id), [names]);

  // ── Depend on the FUNCTIONS, never on the query object ──────────────────
  // `pages` is a fresh object on every render, so `useCallback([pages])` never
  // memoises anything — `refresh` would get a new identity each render, the
  // screen's focus effect would tear down and re-run on every render, and each
  // run calls refresh(). That is an infinite refetch loop, and it is visible:
  // the pull-to-refresh spinner never stops turning, because a new refetch
  // starts before the last one settles.
  //
  // react-query keeps `refetch` and `fetchNextPage` stable across renders
  // precisely so they can be used as dependencies. The booleans are values and
  // are meant to change.
  const { refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = pages;

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    // Guarded rather than trusted: onEndReached fires repeatedly while the
    // user keeps scrolling, and without the in-flight check every one of those
    // would queue another page.
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const status: LedgerStatus =
    pages.isPending ? 'loading' : pages.isError && entries.length === 0 ? 'error' : 'ready';

  return {
    items,
    status,
    // A failure is reported even once rows are on screen — the screen renders
    // it as a band above them rather than replacing them. Stale money the user
    // can still read beats an error screen that throws it away.
    error: pages.error !== null ? describe(pages.error) : null,
    // isRefetching, not isFetching: the latter is also true while a NEXT page
    // loads, which would spin the pull-to-refresh control every time somebody
    // scrolls to the bottom.
    refreshing: pages.isRefetching && !isFetchingNextPage,
    loadingMore: pages.isFetchingNextPage,
    hasMore: hasNextPage,
    categoryName,
    refresh,
    loadMore,
  };
}
