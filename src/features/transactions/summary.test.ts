import { summariseMonth, spendCurve } from './summary';
import type { LedgerEntry } from './ledger';

const NAMES = new Map([
  ['food', 'Food & groceries'],
  ['transport', 'Transport'],
  ['salary', 'Salary'],
]);

let seq = 0;
function entry(
  amountKobo: string,
  type: 'DEBIT' | 'CREDIT',
  categoryId: string,
): LedgerEntry {
  seq += 1;
  return {
    id: `tx-${seq}`,
    accountId: 'acct',
    amountKobo,
    type,
    merchantName: 'Somewhere',
    categoryId,
    transactionDate: '2026-08-20T10:00:00.000Z',
    source: 'EMAIL',
    isVerified: true,
    providerRef: null,
    createdAt: '2026-08-20T10:00:00.000Z',
  };
}

describe('summariseMonth', () => {
  it('separates money in from money out', () => {
    const result = summariseMonth(
      [
        entry('45000000', 'CREDIT', 'salary'),
        entry('1845000', 'DEBIT', 'food'),
        entry('320000', 'DEBIT', 'transport'),
      ],
      NAMES,
    );

    expect(result.inKobo).toBe(45_000_000n);
    expect(result.outKobo).toBe(2_165_000n);
  });

  it('keeps income out of the spending breakdown', () => {
    // A salary is not somewhere money went. If it landed in the denominator
    // one good month would flatten every bar on the screen.
    const result = summariseMonth(
      [entry('45000000', 'CREDIT', 'salary'), entry('1000000', 'DEBIT', 'food')],
      NAMES,
    );

    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]?.categoryId).toBe('food');
    expect(result.breakdown[0]?.share).toBe(1);
  });

  it('shares are of spending and sum to one', () => {
    const result = summariseMonth(
      [
        entry('7500000', 'DEBIT', 'food'),
        entry('2500000', 'DEBIT', 'transport'),
      ],
      NAMES,
    );

    expect(result.breakdown.map((s) => s.share)).toEqual([0.75, 0.25]);
    expect(result.breakdown.reduce((n, s) => n + s.share, 0)).toBeCloseTo(1, 10);
  });

  it('adds up repeated payments to one category', () => {
    const result = summariseMonth(
      [
        entry('1000000', 'DEBIT', 'food'),
        entry('500000', 'DEBIT', 'food'),
        entry('250000', 'DEBIT', 'transport'),
      ],
      NAMES,
    );

    expect(result.breakdown[0]).toMatchObject({ categoryId: 'food', spentKobo: 1_500_000n });
  });

  it('orders the breakdown by amount, largest first', () => {
    const result = summariseMonth(
      [
        entry('250000', 'DEBIT', 'transport'),
        entry('9000000', 'DEBIT', 'food'),
      ],
      NAMES,
    );

    expect(result.breakdown.map((s) => s.categoryId)).toEqual(['food', 'transport']);
  });

  it('names an unknown category rather than showing its id', () => {
    const result = summariseMonth([entry('100000', 'DEBIT', 'not-loaded-yet')], NAMES);
    expect(result.breakdown[0]?.name).toBe('Uncategorised');
  });

  it('handles a month with no spending without dividing by zero', () => {
    const result = summariseMonth([entry('45000000', 'CREDIT', 'salary')], NAMES);

    expect(result.outKobo).toBe(0n);
    expect(result.breakdown).toEqual([]);
  });

  it('is empty for an empty month', () => {
    const result = summariseMonth([], NAMES);
    expect(result).toEqual({ inKobo: 0n, outKobo: 0n, breakdown: [] });
  });

  it('stays exact on figures a float would round', () => {
    // 90,071,992,547,409.93 naira in kobo — past Number.MAX_SAFE_INTEGER, where
    // a float silently loses the last digit.
    const result = summariseMonth(
      [entry('9007199254740993', 'DEBIT', 'food'), entry('1', 'DEBIT', 'transport')],
      NAMES,
    );

    expect(result.outKobo).toBe(9_007_199_254_740_994n);
    expect(result.breakdown[0]?.spentKobo).toBe(9_007_199_254_740_993n);
  });
});

describe('spendCurve', () => {
  // 15 Aug 2026 — a 31-day month, and the month is not quite half gone.
  const NOW = new Date(2026, 7, 15, 12, 0, 0);

  function on(day: number, amountKobo: string, type: 'DEBIT' | 'CREDIT' = 'DEBIT'): LedgerEntry {
    return {
      ...entry(amountKobo, type, 'food'),
      transactionDate: new Date(2026, 7, day, 10, 0, 0).toISOString(),
    };
  }

  it('accumulates spending day by day', () => {
    const curve = spendCurve([on(1, '100000'), on(2, '50000'), on(3, '25000')], NOW);

    expect(curve.cumulative[0]).toBe(100_000n);
    expect(curve.cumulative[1]).toBe(150_000n);
    expect(curve.cumulative[2]).toBe(175_000n);
  });

  it('runs flat across days with no spending rather than skipping them', () => {
    // The slope IS the information. Dropping empty days would compress a quiet
    // week and make the line claim a steeper rate than the month actually had.
    const curve = spendCurve([on(1, '100000'), on(5, '100000')], NOW);

    expect(curve.cumulative).toHaveLength(15);
    expect(curve.cumulative[1]).toBe(100_000n);
    expect(curve.cumulative[3]).toBe(100_000n);
    expect(curve.cumulative[4]).toBe(200_000n);
  });

  it('projects the month end at the rate so far', () => {
    // 150,000 kobo over 15 days of a 31-day month -> 310,000.
    const curve = spendCurve([on(1, '150000')], NOW);

    expect(curve.spentKobo).toBe(150_000n);
    expect(curve.projectedKobo).toBe(310_000n);
  });

  it('leaves income out of the curve', () => {
    const curve = spendCurve([on(1, '100000'), on(2, '9000000', 'CREDIT')], NOW);

    expect(curve.spentKobo).toBe(100_000n);
    expect(curve.cumulative[1]).toBe(100_000n);
  });

  it('ignores rows from another month', () => {
    const july = { ...entry('999999', 'DEBIT', 'food'), transactionDate: new Date(2026, 6, 20).toISOString() };
    const curve = spendCurve([on(1, '100000'), july], NOW);

    expect(curve.spentKobo).toBe(100_000n);
  });

  it('ignores a row dated later than today', () => {
    // A clock-skewed alert must not write past the end of the curve.
    const curve = spendCurve([on(1, '100000'), on(28, '500000')], NOW);

    expect(curve.cumulative).toHaveLength(15);
    expect(curve.spentKobo).toBe(100_000n);
  });

  it('knows the length of the month it is in', () => {
    expect(spendCurve([], new Date(2026, 1, 10)).daysInMonth).toBe(28); // Feb 2026
    expect(spendCurve([], new Date(2024, 1, 10)).daysInMonth).toBe(29); // Feb 2024, a leap year
    expect(spendCurve([], new Date(2026, 3, 10)).daysInMonth).toBe(30); // April
  });

  it('projects nothing from a month with no spending', () => {
    const curve = spendCurve([], NOW);
    expect(curve.spentKobo).toBe(0n);
    expect(curve.projectedKobo).toBe(0n);
  });

  it('never converts money to a float on the way to a projection', () => {
    // A rate held as a Number would round here; the integer path does not.
    const curve = spendCurve([on(1, '9007199254740993')], NOW);
    expect(curve.projectedKobo).toBe((9_007_199_254_740_993n * 31n) / 15n);
  });
});
