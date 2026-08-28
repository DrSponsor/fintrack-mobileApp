/**
 * Summarising a month of entries.
 *
 * Kept pure and out of the hook because it is money arithmetic, which is the
 * part worth testing directly: what counts as spending, what the shares are a
 * share OF, and that none of it goes near a float.
 */
import type { LedgerEntry } from './ledger';

export interface CategorySlice {
  readonly categoryId: string;
  readonly name: string;
  /** Minor units, always positive — this is spending. */
  readonly spentKobo: bigint;
  /** 0–1 of the month's total spending. */
  readonly share: number;
}

export interface MonthSummary {
  readonly inKobo: bigint;
  readonly outKobo: bigint;
  readonly breakdown: readonly CategorySlice[];
}

/** Ratio of two kobo figures as a number in 0–1, without ever converting the
 *  figures themselves. The ratio is small and safe; the amounts are not. */
function share(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Number((part * 10_000n) / whole) / 10_000;
}

/**
 * Totals a month, and breaks the spending down by category.
 *
 * ── Shares are of SPENDING, not of everything that moved ─────────────────
 * Putting income in the denominator would make one salary shrink every
 * spending bar on the screen, so a month where you earned a lot would look
 * like a month where you spent almost nothing. The question the breakdown
 * answers is "where did my money go", and income is not somewhere it went.
 *
 * ── Transfers out are spending here ──────────────────────────────────────
 * Money sent to a person has left the account, and a breakdown that hid it
 * would not add up to what actually went out. Whether it was "really" an
 * expense is a question for the Analysis tab, which can afford nuance; a
 * glance cannot.
 */
export function summariseMonth(
  entries: readonly LedgerEntry[],
  names: ReadonlyMap<string, string>,
): MonthSummary {
  let inKobo = 0n;
  let outKobo = 0n;
  const perCategory = new Map<string, bigint>();

  for (const entry of entries) {
    const amount = BigInt(entry.amountKobo);
    if (entry.type === 'CREDIT') {
      inKobo += amount;
      continue;
    }
    outKobo += amount;
    perCategory.set(entry.categoryId, (perCategory.get(entry.categoryId) ?? 0n) + amount);
  }

  const breakdown = [...perCategory.entries()]
    .map(([categoryId, spentKobo]) => ({
      categoryId,
      name: names.get(categoryId) ?? 'Uncategorised',
      spentKobo,
      share: share(spentKobo, outKobo),
    }))
    // Descending by amount. Compared as bigints — sorting on Number(kobo)
    // would be fine today and wrong at scale, and there is no reason to
    // introduce the cliff.
    .sort((a, b) => (b.spentKobo > a.spentKobo ? 1 : b.spentKobo < a.spentKobo ? -1 : 0));

  return { inKobo, outKobo, breakdown };
}
