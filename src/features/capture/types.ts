/**
 * Types for entering a transaction by hand.
 *
 * Money crosses the wire as a decimal STRING of kobo and is held as a bigint in
 * memory. It is never a number: `parseFloat('4989.25') * 100` is
 * 498924.99999999994, and rounding hides that at one value and not at another,
 * so the bug surfaces as a single transaction being one kobo out months later
 * in a total nobody can reconcile.
 */

export type TransactionDirection = 'DEBIT' | 'CREDIT';

export type CaptureSource = 'EMAIL' | 'MANUAL' | 'SMS' | 'MONO';

export interface CapturedTransaction {
  readonly id: string;
  readonly accountId: string;
  /** Kobo, as a decimal string. Convert with BigInt, never Number. */
  readonly amountKobo: string;
  readonly type: TransactionDirection;
  readonly merchantName: string;
  readonly categoryId: string;
  readonly transactionDate: string;
  readonly source: CaptureSource;
  readonly isVerified: boolean;
  /**
   * The bank's own id for this payment, when its alert stated one.
   *
   * Null on anything entered by hand, and on banks whose alerts do not print
   * one. Where it exists it is the strongest evidence there is that two
   * records describe the same money.
   */
  readonly providerRef: string | null;
  readonly createdAt: string;
}

/**
 * What the server did with the entry.
 *
 *   recorded            a new row exists
 *   already-recorded    this money is already in the ledger; nothing created
 *   duplicate-suspected close enough to something existing to be worth asking;
 *                       nothing created
 *
 * The last two are successful responses, not errors. `transaction` then carries
 * the row that was collided with rather than a new one — the screen needs it to
 * show WHICH payment it means.
 */
export type ManualCaptureOutcomeKind = 'recorded' | 'already-recorded' | 'duplicate-suspected';

export interface ManualCaptureResult {
  readonly outcome: ManualCaptureOutcomeKind;
  readonly transaction: CapturedTransaction;
  readonly reason?: string;
}

export interface ManualEntryPayload {
  readonly accountId: string;
  readonly amountKobo: string;
  readonly type: TransactionDirection;
  readonly merchantName: string;
  readonly transactionDate: string;
  readonly categoryId?: string | undefined;
  /**
   * Sent only after the user has been shown a possible duplicate and chosen to
   * record it anyway. Never sent on a first attempt.
   */
  readonly force?: boolean | undefined;
}

export interface AccountSummary {
  readonly id: string;
  readonly bankName: string;
  readonly accountLast4: string;
  readonly accountType: 'CURRENT' | 'SAVINGS' | 'WALLET';
  readonly captureMethod: CaptureSource;
  readonly gmailConnected: boolean;
  readonly balanceKobo: string;
}

export interface CategorySummary {
  readonly id: string;
  /** Stable slug — 'food-groceries'. For lookups; never put this on screen. */
  readonly name: string;
  /** What a person reads — 'Food & groceries'. */
  readonly displayName: string;
  readonly icon: string;
}
