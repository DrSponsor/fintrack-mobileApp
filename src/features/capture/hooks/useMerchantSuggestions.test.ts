import { rankMerchants, type MerchantSuggestion } from './useMerchantSuggestions';

/** Invented history. None of these are anybody's real transactions. */
function merchant(
  merchantName: string,
  uses: number,
  categoryId: string | null = 'food',
): MerchantSuggestion {
  return { merchantName, uses, categoryId, lastUsedAt: '2026-09-01T00:00:00.000Z' };
}

const HISTORY: readonly MerchantSuggestion[] = [
  merchant('Ikeja Shopping Mall', 20),
  merchant('Shoprite', 8),
  merchant('Shoprite Ikeja', 3),
  merchant('MTN Airtime', 15, 'airtime'),
  merchant('Uber', 5, null),
];

describe('rankMerchants', () => {
  it('suggests nothing until something has been typed', () => {
    // The alternative is a menu of every merchant appearing under an empty
    // field, which is noise on the screen's most-used input.
    expect(rankMerchants(HISTORY, '')).toEqual([]);
    expect(rankMerchants(HISTORY, '   ')).toEqual([]);
  });

  it('puts a name that starts with what was typed above one that merely contains it', () => {
    // The mall is used far more often, and is still not what somebody typing
    // "sho" is reaching for.
    const ranked = rankMerchants(HISTORY, 'sho');

    expect(ranked.map((entry) => entry.merchantName)).toEqual([
      'Shoprite',
      'Shoprite Ikeja',
      'Ikeja Shopping Mall',
    ]);
  });

  it('keeps the order it was given within each group', () => {
    // The server sorts by frequency then recency; ranking must not scramble
    // that, only split it into two groups.
    const ranked = rankMerchants(HISTORY, 'ikeja');

    expect(ranked.map((entry) => entry.merchantName)).toEqual([
      'Ikeja Shopping Mall',
      'Shoprite Ikeja',
    ]);
  });

  it('ignores case, which is the whole reason this exists', () => {
    // "shoprite" and "Shoprite" becoming two merchants in one ledger is the
    // problem being solved, so matching must not be case-sensitive.
    expect(rankMerchants(HISTORY, 'SHOP').length).toBeGreaterThan(0);
    expect(rankMerchants(HISTORY, 'shoprite')[0]?.merchantName).toBe('Shoprite Ikeja');
  });

  it('does not offer back a name that has been typed in full', () => {
    // There is nothing left to complete, and echoing it looks like the field
    // rejected the input.
    const ranked = rankMerchants(HISTORY, 'Shoprite');

    expect(ranked.map((entry) => entry.merchantName)).not.toContain('Shoprite');
    expect(ranked.map((entry) => entry.merchantName)).toContain('Shoprite Ikeja');
  });

  it('carries the category through, including the honest absence of one', () => {
    // A merchant whose past uses are split evenly reports null, and the form
    // must offer no guess at all rather than a coin toss.
    expect(rankMerchants(HISTORY, 'mtn')[0]?.categoryId).toBe('airtime');
    expect(rankMerchants(HISTORY, 'ube')[0]?.categoryId).toBeNull();
  });

  it('shows at most a handful, so the field does not become a menu', () => {
    const many = Array.from({ length: 30 }, (_, index) => merchant(`Shop ${index}`, 1));

    expect(rankMerchants(many, 'shop').length).toBe(5);
  });

  it('returns nothing when nothing matches', () => {
    expect(rankMerchants(HISTORY, 'zzzz')).toEqual([]);
  });
});
