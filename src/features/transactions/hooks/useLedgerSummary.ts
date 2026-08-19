/**
 * useLedgerSummary — the dashboard's read model.
 *
 * ── Why the balance is `null` and not zero ───────────────────────────────
 * This is the important decision in the file.
 *
 * The dashboard previously printed a hardcoded "₦0.00" under the label TOTAL
 * BALANCE. For someone who has just signed up that is not an empty state, it is
 * a FALSE STATEMENT — it tells a person their money is gone. "We don't know
 * yet" and "you have nothing" are completely different claims, and a finance
 * app that confuses them at first launch has already lost the argument.
 *
 * So the balance is `bigint | null`, and null means unknown. The dashboard is
 * responsible for rendering the difference.
 *
 * ── Where a balance actually comes from ──────────────────────────────────
 * FinTrack cannot ask the bank anything — it reads alerts. But Nigerian bank
 * alerts carry the balance after the transaction, which is why the model has a
 * `balance_after_kobo` column. So the true balance is the one on the most
 * recent alert that carried one, "as of" that alert's timestamp.
 *
 * Summing debits and credits ourselves would be wrong: we only see the
 * transactions the alerts told us about, so our running total drifts from
 * reality the moment anything happens that we did not see. Taking the bank's
 * own stated figure is both simpler and correct, and it is why `asOf` is
 * returned alongside — a balance without a timestamp overstates what is known.
 *
 * ── Two things that keep this cheap on a slow device ─────────────────────
 *
 *   THE RECENT QUERY IS BOUNDED IN THE DATABASE with Q.take, not fetched whole
 *   and sliced in JS. With jsi disabled every row crosses the bridge as
 *   serialised data, so "fetch all then slice" costs the whole table on every
 *   change. That is fine at ten rows and ruinous at ten thousand — and the
 *   ledger is designed to grow forever.
 *
 *   COUNT USES observeCount(), which is a SQL COUNT rather than a fetch of
 *   every record so we can read `.length`.
 *
 * ── Failure is not fatal ─────────────────────────────────────────────────
 * Every subscription is wrapped. A schema mismatch, a failed migration or a
 * corrupt store degrades this to the empty state instead of throwing inside
 * render and taking the first screen after login down with it.
 */
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/core/database/database';
import type { TransactionModel } from '@/core/database/models/Transaction.model';

/** Rows the dashboard shows before "See all". Bounded in SQL — see above. */
export const RECENT_LIMIT = 6;

export interface LedgerSummary {
  /** False until the first query resolves, so the UI can hold rather than
   *  flashing an empty state at someone who does have data. */
  readonly ready: boolean;
  readonly count: number;
  readonly recent: readonly TransactionModel[];
  /** Minor units, or null when genuinely unknown. Never zero-as-unknown. */
  readonly balanceKobo: bigint | null;
  /** When that balance was true. Null whenever balanceKobo is null. */
  readonly asOf: Date | null;
}

const EMPTY: LedgerSummary = {
  ready: false,
  count: 0,
  recent: [],
  balanceKobo: null,
  asOf: null,
};

export function useLedgerSummary(): LedgerSummary {
  const [summary, setSummary] = useState<LedgerSummary>(EMPTY);

  useEffect(() => {
    let active = true;

    // `unknown` rather than a WatermelonDB Subscription type: the two
    // observables here are typed differently and both only need unsubscribe.
    const subscriptions: { unsubscribe: () => void }[] = [];

    try {
      const collection = database.get<TransactionModel>('transactions');

      const recentQuery = collection.query(
        Q.sortBy('transaction_date', Q.desc),
        Q.take(RECENT_LIMIT),
      );

      subscriptions.push(
        recentQuery.observe().subscribe({
          next: (rows) => {
            if (!active) return;
            // The newest row that actually carried a balance. Alerts do not all
            // include one, so this is not simply rows[0].
            const withBalance = rows.find((row) => row.balanceAfterKobo !== null);
            setSummary((prev) => ({
              ...prev,
              ready: true,
              recent: rows,
              balanceKobo:
                withBalance?.balanceAfterKobo != null
                  ? BigInt(withBalance.balanceAfterKobo)
                  : null,
              asOf: withBalance?.transactionDate ?? null,
            }));
          },
          error: () => {
            // Degrade to "nothing recorded" rather than crashing the screen.
            if (active) setSummary((prev) => ({ ...prev, ready: true }));
          },
        }),
      );

      subscriptions.push(
        collection
          .query()
          .observeCount()
          .subscribe({
            next: (count) => {
              if (active) setSummary((prev) => ({ ...prev, ready: true, count }));
            },
            error: () => {
              if (active) setSummary((prev) => ({ ...prev, ready: true }));
            },
          }),
      );
    } catch {
      // Collection missing entirely — an unmigrated or corrupt store.
      //
      // Deferred rather than set inline: this is the one failure path that
      // throws SYNCHRONOUSLY inside the effect body, and setState there
      // cascades an extra render before the first paint. The other two error
      // paths are already async because they arrive through subscription
      // callbacks.
      queueMicrotask(() => {
        if (active) setSummary((prev) => ({ ...prev, ready: true }));
      });
    }

    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, []);

  return summary;
}
