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

// ── The month's shape, not just its totals ────────────────────────────────

export interface SpendCurve {
  readonly daysInMonth: number;
  /** Day of the month, 1-based. */
  readonly today: number;
  /** Running total of spending at the END of each day so far. Length `today`. */
  readonly cumulative: readonly bigint[];
  readonly spentKobo: bigint;
  /**
   * What the month ends at if the current daily rate holds.
   *
   * Deliberately the simplest honest model: total so far, divided by days
   * elapsed, extended to the month end. Anything cleverer — weekday weighting,
   * excluding one-offs, last month's shape — is a guess the app cannot
   * justify to someone looking at their own money, and a projection nobody can
   * reconstruct in their head is one nobody should be asked to trust.
   */
  readonly projectedKobo: bigint;
}

/** Days in the local calendar month `date` falls in. */
export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Cumulative spending through the month, and where it lands at this rate.
 *
 * Days with no spending still get an entry — the curve must be flat across
 * them, not skip them, or the line would compress a quiet week into nothing
 * and misstate the slope, which IS the information.
 */
export function spendCurve(entries: readonly LedgerEntry[], now: Date = new Date()): SpendCurve {
  const days = daysInMonth(now);
  const today = now.getDate();

  const perDay = new Array<bigint>(today).fill(0n);
  for (const entry of entries) {
    if (entry.type === 'CREDIT') continue;
    const when = new Date(entry.transactionDate);
    // Guard the window: a caller can hand this rows outside the month, and a
    // stray row must not write past the end of the array.
    if (when.getFullYear() !== now.getFullYear() || when.getMonth() !== now.getMonth()) continue;
    const day = when.getDate();
    if (day < 1 || day > today) continue;
    perDay[day - 1] = (perDay[day - 1] ?? 0n) + BigInt(entry.amountKobo);
  }

  const cumulative: bigint[] = [];
  let running = 0n;
  for (const amount of perDay) {
    running += amount;
    cumulative.push(running);
  }

  const spentKobo = running;
  // Integer arithmetic throughout — the rate is never materialised as a
  // fraction, so nothing rounds until the final figure.
  const projectedKobo = today > 0 ? (spentKobo * BigInt(days)) / BigInt(today) : 0n;

  return { daysInMonth: days, today, cumulative, spentKobo, projectedKobo };
}
