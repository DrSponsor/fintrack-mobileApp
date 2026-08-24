/**
 * The shape every issuer parser produces, regardless of how its alert is worded.
 */

/** Direction of money, matching the app's jade/clay semantics. */
export type Direction = 'debit' | 'credit';

/**
 * How the money moved. Derived from the narrative, NOT from the reference
 * prefix — see the note in accessBank.ts about why the numeric prefix is only
 * a hint.
 */
export type Channel =
  /** Bank-app transfer to another account. */
  | 'transfer'
  /** Card or web payment to a merchant. */
  | 'web'
  /** Point-of-sale terminal. */
  | 'pos'
  /** Cash machine. */
  | 'atm'
  /** Bank charge, levy, VAT, stamp duty. */
  | 'fee'
  /** Recognised as an alert, but the narrative form is not one we know. */
  | 'unknown';

export interface ParsedAlert {
  readonly issuer: string;
  readonly direction: Direction;
  readonly channel: Channel;
  /** Minor units. bigint, never a float — see nairaToKobo. */
  readonly amountKobo: bigint;
  /**
   * Balance after the transaction, as the bank states it.
   *
   * Treated as authoritative rather than derived by summing transactions,
   * because fees arrive as their own separate alerts and a running total
   * computed from alerts alone drifts. Null when the field was unreadable.
   */
  readonly balanceKobo: bigint | null;
  /** Masked account, e.g. "012******345". Identifies which account, without
   *  ever storing the full number. */
  readonly accountMask: string | null;
  /** The bank's own reference for the transaction. Used for deduplication. */
  readonly reference: string | null;
  /** The narrative with the reference stripped — what a person would read. */
  readonly narrative: string;
  /**
   * Best guess at who was paid or who paid. Null when the narrative carries no
   * usable name, which happens more often than it should.
   */
  readonly counterparty: string | null;
  /** ISO 3166 alpha-2 where the alert states one — "NG", "US". Foreign
   *  payments are worth flagging to a user. */
  readonly country: string | null;
  /** The value date the bank printed. Date only: these alerts carry no time. */
  readonly valueDate: string | null;
  /** The original text, kept so an unparsed or mis-parsed alert can always be
   *  inspected and re-processed by a later parser version. */
  readonly raw: string;
}

/** Why an alert could not be parsed. Kept explicit so failures are counted and
 *  inspected rather than silently dropped. */
export interface ParseFailure {
  readonly ok: false;
  readonly reason: string;
  readonly raw: string;
}

export interface ParseSuccess {
  readonly ok: true;
  readonly alert: ParsedAlert;
}

export type ParseResult = ParseSuccess | ParseFailure;
