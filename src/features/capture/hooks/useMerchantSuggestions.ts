/**
 * Offering back the merchants a person has already used.
 *
 * ── Why this is worth doing at all ───────────────────────────────────────
 * It looks like a typing shortcut and it is really about data integrity.
 * Typed by hand, the same shop becomes "Shoprite", "shoprite", "Shop Rite"
 * and "SHOPRITE" — four merchants in one person's own ledger. The backend
 * already carries `getMerchantFingerprint` because of exactly this, but
 * normalising after the fact cannot repair a ledger that already reads as
 * four shops, and it cannot make a correction on one spelling teach the
 * categoriser about the others.
 *
 * Offering the previous spelling collapses the variants at the point of
 * entry, which is the only place it is cheap.
 *
 * ── Why the list comes from the server ───────────────────────────────────
 * The obvious local source is the WatermelonDB `transactions` table. It is
 * scaffolding: the schema exists, but the only `database.write` in the app
 * is the logout clear, so the table is always empty.
 *
 * The other tempting shortcut is to suggest from whatever the ledger screen
 * happens to have paged in. That is the pattern `useDashboard` warns about in
 * its own header — an answer derived from "whatever was loaded" is silently
 * partial while looking complete. A person who shops somewhere monthly would
 * find it missing exactly when they are furthest from having typed it
 * recently.
 *
 * So the server groups it: a couple of hundred rows at most, whatever the
 * length of the history behind them.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { useUserScope } from '@/features/transactions/hooks/useUserScope';

export interface MerchantSuggestion {
  readonly merchantName: string;
  /** The category this merchant usually lands in, or null when its past uses
   *  are split evenly and there is no usual answer to offer. */
  readonly categoryId: string | null;
  readonly uses: number;
  readonly lastUsedAt: string;
}

export const merchantKeys = {
  all: (user: string) => ['ledger', user, 'merchants'] as const,
};

/** Most a person can usefully scan without the list becoming a menu. */
const SHOWN = 5;

/**
 * Ranks the stored merchants against what has been typed so far.
 *
 * A prefix match outranks a match in the middle, because that is the one the
 * typist is most likely reaching for — "sho" should put "Shoprite" above
 * "Ikeja Shopping Mall" even if the mall is used more often. Within each
 * group the server's ordering (frequency, then recency) is preserved.
 *
 * Exported for its own test: this is the part with an actual opinion in it.
 */
export function rankMerchants(
  all: readonly MerchantSuggestion[],
  typed: string,
): readonly MerchantSuggestion[] {
  const needle = typed.trim().toLowerCase();
  if (needle.length === 0) return [];

  const starts: MerchantSuggestion[] = [];
  const contains: MerchantSuggestion[] = [];

  for (const candidate of all) {
    const name = candidate.merchantName.toLowerCase();
    // An exact match is not a suggestion — there is nothing left to complete,
    // and offering it back looks like the field failed to accept the input.
    if (name === needle) continue;
    if (name.startsWith(needle)) starts.push(candidate);
    else if (name.includes(needle)) contains.push(candidate);
  }

  return [...starts, ...contains].slice(0, SHOWN);
}

export interface UseMerchantSuggestions {
  readonly suggestions: readonly MerchantSuggestion[];
  /** Every known merchant, for looking one up after it has been picked. */
  readonly all: readonly MerchantSuggestion[];
}

export function useMerchantSuggestions(typed: string): UseMerchantSuggestions {
  const user = useUserScope();

  const query = useQuery({
    queryKey: merchantKeys.all(user),
    queryFn: () => api.get<readonly MerchantSuggestion[]>(endpoints.transactions.merchants),
    // A person's merchant list changes when they record something, and this
    // screen is where they do it. Five minutes keeps the typeahead instant
    // without holding a stale list across a session of entries — and the key
    // sits under `ledger`, so recording an entry invalidates it along with
    // everything else.
    staleTime: 5 * 60 * 1000,
  });

  const all = useMemo(() => query.data ?? [], [query.data]);
  const suggestions = useMemo(() => rankMerchants(all, typed), [all, typed]);

  return { suggestions, all };
}
