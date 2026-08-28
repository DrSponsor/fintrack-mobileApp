/**
 * The ledger's read model — turning a flat page of transactions into ruled,
 * dated sections.
 *
 * Kept free of components so the two things that are actually easy to get
 * wrong can be tested directly: where a day starts, and what a signed amount
 * says.
 *
 * ── Days are LOCAL, never UTC ─────────────────────────────────────────────
 * The server sends an ISO instant. Grouping on the UTC calendar date would put
 * a payment made at 9pm in Lagos on the following day for anyone west of the
 * meridian, and would move a transaction between sections purely because the
 * user boarded a plane. A person's "today" is their own midnight, so every key
 * here is built from local date parts.
 *
 * ── Direction is stated twice, on purpose ────────────────────────────────
 * Every amount carries a sign as well as a colour. Colour alone fails for the
 * ~8% of men with a red-green deficiency — and jade against clay is precisely
 * that axis — so the sign is the accessible signal and the colour is the fast
 * one. Neither is decoration.
 */
import { formatKoboToNaira } from '@/shared/components/AmountDisplay/AmountDisplay';
import type { CapturedTransaction, TransactionDirection } from '@/features/capture/types';

/**
 * A transaction as the ledger reads it.
 *
 * Deliberately the same type manual entry already defines rather than a
 * parallel one: it is the shape the API returns, and a second definition of
 * "a transaction" is how two screens end up disagreeing about what a
 * transaction is.
 */
export type LedgerEntry = CapturedTransaction;

/** One row in the flattened list — either a date heading or a transaction. */
export type LedgerItem =
  | {
      readonly kind: 'day';
      readonly key: string;
      readonly label: string;
      /** Credits less debits for the day. Signed. */
      readonly netKobo: bigint;
      readonly count: number;
    }
  | { readonly kind: 'entry'; readonly key: string; readonly entry: LedgerEntry };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number): string => String(n).padStart(2, '0');

/** Stable key for the local calendar day a date falls on. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * How a day is named in the heading.
 *
 * "Today" and "Yesterday" are how people actually refer to recent days, and
 * they are the two that carry the most attention. Anything older gets its
 * weekday, because "Mon 24 Aug" tells you something "24 Aug" does not — most
 * people remember what they did on a Monday, not on a number. The year appears
 * only when it is not the current one, since printing it every time is noise
 * that earns nothing 99% of the year.
 */
export function dayLabel(key: string, now: Date = new Date()): string {
  const todayKey = dayKey(now);
  if (key === todayKey) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday)) return 'Yesterday';

  const [y, m, d] = key.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return key;

  // Built from parts rather than parsed: `new Date('2026-08-24')` is read as
  // UTC midnight, which lands on the 23rd for anyone behind the meridian and
  // would print the wrong weekday.
  const date = new Date(y, m - 1, d);
  const weekday = DAYS[date.getDay()] ?? '';
  const month = MONTHS[m - 1] ?? '';
  const stem = `${weekday} ${d} ${month}`;
  return y === now.getFullYear() ? stem : `${stem} ${y}`;
}

/** The time of day a transaction happened, as the row prints it. */
export function entryTime(date: Date): string {
  const hours = date.getHours();
  const suffix = hours < 12 ? 'am' : 'pm';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${pad(date.getMinutes())} ${suffix}`;
}

/**
 * An amount with its direction stated.
 *
 * U+2212 MINUS SIGN, not a hyphen: in a monospaced column a hyphen is a
 * different width from the plus it sits above, so the naira marks stop
 * aligning — which is the entire reason the amounts are monospaced.
 */
export function signedNaira(amountKobo: bigint, type: TransactionDirection): string {
  const magnitude = amountKobo < 0n ? -amountKobo : amountKobo;
  return `${type === 'CREDIT' ? '+' : '−'}${formatKoboToNaira(magnitude)}`;
}

/** A day's net, which unlike a single entry can legitimately be zero. */
export function netNaira(netKobo: bigint): string {
  if (netKobo === 0n) return formatKoboToNaira(0n);
  const magnitude = netKobo < 0n ? -netKobo : netKobo;
  return `${netKobo > 0n ? '+' : '−'}${formatKoboToNaira(magnitude)}`;
}

/**
 * Flattens a page of transactions into headed sections.
 *
 * Grouped through a Map keyed by day rather than by watching for the key to
 * change between consecutive rows. The server orders by date descending, so
 * consecutive grouping would usually work — but "usually" here means that a
 * single out-of-order row (a manual entry back-dated into a day already on
 * screen, two pages stitched at a boundary) prints the same date heading
 * twice, and a ledger that shows "Today" twice is one nobody trusts. The Map
 * preserves first-seen order, so the server's ordering still decides the
 * layout; it simply cannot be made to contradict itself.
 */
export function groupByDay(
  entries: readonly LedgerEntry[],
  now: Date = new Date(),
): readonly LedgerItem[] {
  const days = new Map<string, LedgerEntry[]>();

  for (const entry of entries) {
    const key = dayKey(new Date(entry.transactionDate));
    const bucket = days.get(key);
    if (bucket === undefined) days.set(key, [entry]);
    else bucket.push(entry);
  }

  const items: LedgerItem[] = [];
  for (const [key, bucket] of days) {
    let netKobo = 0n;
    for (const entry of bucket) {
      const amount = BigInt(entry.amountKobo);
      netKobo += entry.type === 'CREDIT' ? amount : -amount;
    }
    items.push({ kind: 'day', key, label: dayLabel(key, now), netKobo, count: bucket.length });
    for (const entry of bucket) items.push({ kind: 'entry', key: entry.id, entry });
  }

  return items;
}
