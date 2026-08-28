import {
  dayKey,
  dayLabel,
  entryTime,
  signedNaira,
  netNaira,
  groupByDay,
  type LedgerEntry,
} from './ledger';

/** A transaction with only the fields the ledger reads varying. */
function entry(over: Partial<LedgerEntry> & Pick<LedgerEntry, 'id'>): LedgerEntry {
  return {
    accountId: 'account-1',
    amountKobo: '100000',
    type: 'DEBIT',
    merchantName: 'Shoprite',
    categoryId: 'category-1',
    transactionDate: '2026-08-24T14:28:00.000Z',
    source: 'MANUAL',
    isVerified: false,
    providerRef: null,
    transferGroupId: null,
    createdAt: '2026-08-24T14:28:00.000Z',
    ...over,
  };
}

describe('dayKey', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // 23:30 local on the 24th. Built from local parts so the assertion holds
    // wherever this runs — under UTC the instant would still be the 24th, but
    // in any negative offset the UTC date is the 25th, and grouping on that
    // would file an evening payment under tomorrow.
    const late = new Date(2026, 7, 24, 23, 30);
    expect(dayKey(late)).toBe('2026-08-24');
  });

  it('zero-pads so keys sort lexically', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('dayLabel', () => {
  const now = new Date(2026, 7, 24, 12, 0);

  it('names today and yesterday', () => {
    expect(dayLabel('2026-08-24', now)).toBe('Today');
    expect(dayLabel('2026-08-23', now)).toBe('Yesterday');
  });

  it('crosses a month boundary going back a day', () => {
    expect(dayLabel('2026-07-31', new Date(2026, 7, 1, 9, 0))).toBe('Yesterday');
  });

  it('gives older days their weekday', () => {
    expect(dayLabel('2026-08-17', now)).toBe('Mon 17 Aug');
  });

  it('adds the year only when it is not the current one', () => {
    expect(dayLabel('2025-12-31', now)).toBe('Wed 31 Dec 2025');
  });
});

describe('entryTime', () => {
  it('reads midnight as 12 am and noon as 12 pm', () => {
    expect(entryTime(new Date(2026, 7, 24, 0, 5))).toBe('12:05 am');
    expect(entryTime(new Date(2026, 7, 24, 12, 0))).toBe('12:00 pm');
  });

  it('pads the minutes', () => {
    expect(entryTime(new Date(2026, 7, 24, 14, 8))).toBe('2:08 pm');
  });
});

describe('signedNaira', () => {
  it('states direction with a sign as well as a colour', () => {
    expect(signedNaira(500000n, 'DEBIT')).toBe('−₦5,000.00');
    expect(signedNaira(500000n, 'CREDIT')).toBe('+₦5,000.00');
  });

  it('uses a true minus sign, which is the same width as the plus', () => {
    // A hyphen is narrower in JetBrains Mono, so a column mixing the two stops
    // aligning on the naira mark — the one thing monospacing the amounts buys.
    expect(signedNaira(1n, 'DEBIT').charCodeAt(0)).toBe(0x2212);
    expect(signedNaira(1n, 'DEBIT')).not.toContain('-');
  });

  it('never prints a double sign for an amount already negative', () => {
    expect(signedNaira(-500000n, 'DEBIT')).toBe('−₦5,000.00');
  });
});

describe('netNaira', () => {
  it('leaves a zero day unsigned', () => {
    expect(netNaira(0n)).toBe('₦0.00');
  });

  it('signs a day that went either way', () => {
    expect(netNaira(2450000n)).toBe('+₦24,500.00');
    expect(netNaira(-2450000n)).toBe('−₦24,500.00');
  });
});

describe('groupByDay', () => {
  const now = new Date(2026, 7, 24, 18, 0);

  it('heads each day and keeps its entries under it', () => {
    const items = groupByDay(
      [
        entry({ id: 'a', transactionDate: new Date(2026, 7, 24, 14, 0).toISOString() }),
        entry({ id: 'b', transactionDate: new Date(2026, 7, 23, 9, 0).toISOString() }),
      ],
      now,
    );

    expect(items.map((i) => i.kind)).toEqual(['day', 'entry', 'day', 'entry']);
    expect(items[0]).toMatchObject({ kind: 'day', label: 'Today', count: 1 });
    expect(items[2]).toMatchObject({ kind: 'day', label: 'Yesterday', count: 1 });
  });

  it('nets credits against debits for the day', () => {
    const items = groupByDay(
      [
        entry({ id: 'a', amountKobo: '25000000', type: 'CREDIT' }),
        entry({ id: 'b', amountKobo: '500000', type: 'DEBIT' }),
      ],
      now,
    );

    const head = items[0];
    expect(head?.kind).toBe('day');
    if (head?.kind === 'day') expect(head.netKobo).toBe(24500000n);
  });

  it('never heads the same day twice when a row arrives out of order', () => {
    // A back-dated manual entry, or two pages stitched at a day boundary.
    // Watching for the key to change between consecutive rows would print
    // "Today" twice here.
    const items = groupByDay(
      [
        entry({ id: 'a', transactionDate: new Date(2026, 7, 24, 14, 0).toISOString() }),
        entry({ id: 'b', transactionDate: new Date(2026, 7, 23, 9, 0).toISOString() }),
        entry({ id: 'c', transactionDate: new Date(2026, 7, 24, 8, 0).toISOString() }),
      ],
      now,
    );

    const headings = items.filter((i) => i.kind === 'day');
    expect(headings).toHaveLength(2);
    expect(items[0]).toMatchObject({ label: 'Today', count: 2 });
  });

  it('holds the server ordering rather than resorting', () => {
    // The cursor encodes the server's order. Re-sorting here would make the
    // next page stitch onto a list the server never described.
    const items = groupByDay(
      [
        entry({ id: 'older', transactionDate: new Date(2026, 7, 20, 9, 0).toISOString() }),
        entry({ id: 'newer', transactionDate: new Date(2026, 7, 24, 9, 0).toISOString() }),
      ],
      now,
    );

    expect(items.filter((i) => i.kind === 'day').map((i) => i.kind === 'day' && i.label)).toEqual([
      'Thu 20 Aug',
      'Today',
    ]);
  });

  it('returns nothing for an empty page', () => {
    expect(groupByDay([], now)).toEqual([]);
  });

  it('reads kobo as bigint, so a large day does not lose precision', () => {
    const items = groupByDay(
      [entry({ id: 'a', amountKobo: '900719925474099', type: 'CREDIT' })],
      now,
    );
    const head = items[0];
    if (head?.kind === 'day') expect(head.netKobo).toBe(900719925474099n);
  });
});
