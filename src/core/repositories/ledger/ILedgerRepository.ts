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

export interface ILedgerRepository {
  /** One page of transactions, newest first. */
  listTransactions(cursor?: string | undefined, limit?: number): Promise<LedgerPage>;
  /**
   * Needed because a transaction carries a category ID, not a name. Fetched
   * once and held for the session — the set changes when the product ships a
   * new category, not while a person is scrolling.
   */
  listCategories(): Promise<readonly CategorySummary[]>;
}
