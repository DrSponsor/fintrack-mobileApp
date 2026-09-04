/**
 * Ledger Repository Interface
 *
 * Reading the transaction list, behind a contract so the screen can be driven
 * from a fake. Same shape as ICaptureRepository and IAuthRepository.
 */
import type { LedgerEntry } from '@/features/transactions/ledger';
import type { CategorySummary } from '@/features/capture/types';

export interface LedgerPage {
  readonly entries: readonly LedgerEntry[];
  /**
   * Opaque position to resume from, echoed straight back to the server.
   *
   * Undefined means the server did not offer one, which is how it says there
   * is nothing after this page. Never construct or parse this — it encodes
   * both the id and the timestamp of the last row, and the pair is what makes
   * the page boundary stable when two transactions share a timestamp.
   */
  readonly cursor: string | undefined;
  readonly hasMore: boolean;
}

/**
 * How far a correction reaches.
 *
 *   transaction  only this entry — "this particular payment was different"
 *   merchant     this counterparty in general, backfilling earlier entries
 *
 * The distinction is not cosmetic. The same person can receive money for food
 * one week and a thrift contribution the next, so a correction on a transfer
 * describes THAT payment and must not rewrite months of history. The server
 * picks a sensible default when none is given; this exists so the user can
 * override it, because only they know which of the two they meant.
 */
export type CorrectionScope = 'transaction' | 'merchant';

export interface CorrectionResult {
  /** The reach that was actually applied — the server's default, if none was sent. */
  readonly scope: CorrectionScope;
  /** How many EARLIER entries were also changed. Zero for a single correction. */
  readonly backfilled: number;
}

/** Bounds a read to a date window. Both ends are ISO instants. */
export interface LedgerWindow {
  readonly startDate: string;
  readonly endDate: string;
}

export interface ILedgerRepository {
  /**
   * One page of transactions, newest first.
   *
   * `window` bounds the read to a date range. The dashboard needs it because a
   * summary derived from "whatever happened to be loaded" is not a summary —
   * it is a figure that is silently wrong whenever the month is longer than
   * one page, which in a finance app is worse than showing nothing.
   */
  listTransactions(
    cursor?: string | undefined,
    limit?: number,
    window?: LedgerWindow | undefined,
  ): Promise<LedgerPage>;
  /**
   * Needed because a transaction carries a category ID, not a name. Fetched
   * once and held for the session — the set changes when the product ships a
   * new category, not while a person is scrolling.
   */
  listCategories(): Promise<readonly CategorySummary[]>;
  /** One transaction. The detail screen reads it fresh rather than trusting a
   *  row the list may have cached before a correction. */
  getTransaction(id: string): Promise<LedgerEntry>;
  /** Re-files a transaction, returning what the change actually reached. */
  correctCategory(id: string, categoryId: string, scope: CorrectionScope): Promise<CorrectionResult>;
  /** Moves a typed entry to when it actually happened. */
  correctDate(id: string, at: Date): Promise<void>;
}
