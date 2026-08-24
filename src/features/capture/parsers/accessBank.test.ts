/**
 * Access Bank parser tests.
 *
 * The five SAMPLES below are real alerts from a live account, with the figures
 * altered. They are kept verbatim in structure — including the truncated
 * `Total:` lines, which are the single most useful thing in the corpus and
 * would be "tidied away" by anyone writing fixtures from imagination.
 */
import { nairaToKobo } from './nairaToKobo';
import { looksLikeAccessBank, parseAccessBank } from './accessBank';

const SAMPLES = {
  transferA: `Debit
Amt:NGN4,989.25
Acc:012******345
Desc:312ABCD2600000AA/MOBILE TRF TO PAY/ /JOHN ADEBAYO
Date:17/08/2026
Avail Bal:NGN200,000.00
Total:NGN2`,

  transferB: `Debit
Amt:NGN4,873.50
Acc:012******345
Desc:312ABCD2600000AA/MOBILE TRF TO PAY/ /JOHN ADEBAYO
Date:15/08/2026
Avail Bal:NGN205,000.00
Total:NGN2`,

  webForeign: `Debit
Amt:NGN27,380.00
Acc:012******345
Desc:098VCPW2622604P7/WEB PYMT +14152360599 +14152360599 00US
Date:14/08/2026
Avail Bal:NGN209,884.25
Total:NGN209`,

  transferC: `Debit
Amt:NGN5,000.00
Acc:012******345
Desc:312ABCD2600000AAp/MOBILE TRF TO PAY/ /JOHN ADEBAYO
Date:14/08/2026
Avail Bal:NGN237,314.25
Total:NGN2`,

  webSpotify: `Debit
Amt:NGN1,600.00
Acc:012******345
Desc:098WNVI2622609U1/WEB PYMT SPOTIFY 234000000000 00NG
Date:14/08/2026
Avail Bal:NGN242,325.00
Total:NGN242,325.0`,
} as const;

describe('nairaToKobo', () => {
  it('converts without floating point error', () => {
    // parseFloat('4989.25') * 100 === 498924.99999999994
    expect(nairaToKobo('4,989.25')).toBe(498_925n);
    expect(nairaToKobo('NGN27,380.00')).toBe(2_738_000n);
    expect(nairaToKobo('₦1,600.00')).toBe(160_000n);
  });

  it('treats a single decimal as tenths of naira, not kobo', () => {
    // "242,325.0" is two hundred odd thousand naira exactly, not 0.0 kobo.
    expect(nairaToKobo('242,325.0')).toBe(24_232_500n);
  });

  it('accepts a bare whole figure', () => {
    expect(nairaToKobo('1600')).toBe(160_000n);
  });

  it('rejects text that is not a figure', () => {
    expect(nairaToKobo('')).toBeNull();
    expect(nairaToKobo('NGN')).toBeNull();
    expect(nairaToKobo('12.345')).toBeNull();
    expect(nairaToKobo('abc')).toBeNull();
  });
});

describe('looksLikeAccessBank', () => {
  it('recognises every real sample', () => {
    for (const sample of Object.values(SAMPLES)) {
      expect(looksLikeAccessBank(sample)).toBe(true);
    }
  });

  it('does not claim unrelated messages', () => {
    expect(looksLikeAccessBank('Your OTP is 123456')).toBe(false);
    expect(looksLikeAccessBank('Debit card delivered')).toBe(false);
  });
});

describe('parseAccessBank — transfers', () => {
  it('extracts amount, balance, account and reference', () => {
    const result = parseAccessBank(SAMPLES.transferA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.direction).toBe('debit');
    expect(result.alert.channel).toBe('transfer');
    expect(result.alert.amountKobo).toBe(498_925n);
    expect(result.alert.balanceKobo).toBe(20_000_000n);
    expect(result.alert.accountMask).toBe('012******345');
    expect(result.alert.reference).toBe('312ABCD2600000AA');
    expect(result.alert.valueDate).toBe('2026-08-17');
  });

  it('finds the counterparty behind the empty slash segment', () => {
    const result = parseAccessBank(SAMPLES.transferB);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.counterparty).toBe('JOHN ADEBAYO');
  });

  it('handles a mixed-case reference', () => {
    // "312ABCD2600000AAp" — the bank does not guarantee upper case.
    const result = parseAccessBank(SAMPLES.transferC);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.reference).toBe('312ABCD2600000AAp');
    expect(result.alert.counterparty).toBe('JOHN ADEBAYO');
  });
});

describe('parseAccessBank — web payments', () => {
  it('extracts a named merchant and drops the acquirer reference', () => {
    const result = parseAccessBank(SAMPLES.webSpotify);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.channel).toBe('web');
    expect(result.alert.counterparty).toBe('SPOTIFY');
    expect(result.alert.country).toBe('NG');
    expect(result.alert.amountKobo).toBe(160_000n);
  });

  it('keeps a phone number standing in for a merchant name', () => {
    // Real alert. The descriptor carries no merchant, only a US phone number
    // repeated twice; dropping both would leave the transaction anonymous.
    const result = parseAccessBank(SAMPLES.webForeign);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.counterparty).toBe('+14152360599');
    expect(result.alert.country).toBe('US');
  });
});

describe('parseAccessBank — the truncated Total field', () => {
  it('never reads Total, however badly it is cut', () => {
    // The whole point: Total arrives as "NGN2" for a ₦200,000 balance.
    const result = parseAccessBank(SAMPLES.transferA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.balanceKobo).toBe(20_000_000n);
  });

  it('reads Avail Bal even when Total survived almost intact', () => {
    const result = parseAccessBank(SAMPLES.webSpotify);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Avail Bal 242,325.00 vs the truncated Total 242,325.0 — one kobo apart,
    // which is exactly the kind of near-miss that would never be noticed.
    expect(result.alert.balanceKobo).toBe(24_232_500n);
  });
});

describe('parseAccessBank — dates', () => {
  it('reads DD/MM/YYYY and not MM/DD/YYYY', () => {
    const result = parseAccessBank(SAMPLES.transferA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 17/08 is the 17th of August. Read as US format it would be invalid, and
    // `new Date()` would produce a wrong date rather than an error.
    expect(result.alert.valueDate).toBe('2026-08-17');
  });

  it('returns null rather than a wrong date for an unreadable field', () => {
    const broken = SAMPLES.transferA.replace('Date:17/08/2026', 'Date:17-08-2026');
    const result = parseAccessBank(broken);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.valueDate).toBeNull();
  });
});

describe('parseAccessBank — failure is explicit', () => {
  it('fails on a message with no direction line', () => {
    const result = parseAccessBank('Amt:NGN100.00\nAcc:123');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/Debit\/Credit/);
  });

  it('fails on a missing amount rather than defaulting to zero', () => {
    const result = parseAccessBank('Debit\nAcc:012******345');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/Amt/);
  });

  it('keeps the raw text on failure so it can be reprocessed later', () => {
    const raw = 'Debit\nAcc:012******345';
    const result = parseAccessBank(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.raw).toBe(raw);
  });
});

describe('parseAccessBank — fees', () => {
  it('classifies a levy as a fee, not as spending', () => {
    // Fees arrive as their own alerts; filing one as a purchase would
    // double-count the transaction that triggered it.
    const fee = `Debit
Amt:NGN10.75
Acc:012******345
Desc:312ABCD2600000AA/ELECTRONIC MONEY TRANSFER LEVY
Date:17/08/2026
Avail Bal:NGN199,989.25
Total:NGN1`;
    const result = parseAccessBank(fee);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.channel).toBe('fee');
    expect(result.alert.amountKobo).toBe(1_075n);
  });
});

/**
 * Real credit alerts. These are the samples that corrected the credit path —
 * both forms parsed to a confidently wrong result before they existed, without
 * throwing anything.
 */
const CREDITS = {
  paystackA: `Credit
Amt:NGN4,825.00
Acc:012******345
Desc:312NIPL2620100ee/Paystack/PSST10JDOvkaaawt071756082
Date:20/07/2026
Avail Bal:NGN192,273.50
Total:NGN192,273.`,

  paystackB: `Credit
Amt:NGN4,825.00
Acc:012******345
Desc:312NIPL2620100Xd/Paystack/PSST108WMhqdQWAu071756082
Date:20/07/2026
Avail Bal:NGN197,098.50
Total:NGN197,098.`,

  fromPerson: `Credit
Amt:NGN3,000.00
Acc:012******345
Desc:312HABR2620200bk/Transfer from YETUNDE TEMILOLA OLUYOMBO
Date:21/07/2026
Avail Bal:NGN204,923.50
Total:NGN204`,

  fromHyphenatedPerson: `Credit
Amt:NGN5,000.00
Acc:012******345
Desc:312HABR2620200ia/Transfer from ABDUL-HAMEED AREMU MUSTAPHA
Date:21/07/2026
Avail Bal:NGN209,923.50
Total:NGN2`,
} as const;

describe('parseAccessBank — credits', () => {
  it('reads direction as inbound', () => {
    for (const sample of Object.values(CREDITS)) {
      const result = parseAccessBank(sample);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.alert.direction).toBe('credit');
    }
  });

  it('names the processor on a NIP credit that contains no transfer keyword', () => {
    // Regression: "Paystack/PSST…" has no TRF or TRANSFER token, so it fell
    // through every branch to `unknown` with a null counterparty.
    const result = parseAccessBank(CREDITS.paystackA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.channel).toBe('transfer');
    expect(result.alert.counterparty).toBe('Paystack');
    expect(result.alert.reference).toBe('312NIPL2620100ee');
    expect(result.alert.amountKobo).toBe(482_500n);
  });

  it('does not mistake the processor reference for the counterparty', () => {
    const result = parseAccessBank(CREDITS.paystackB);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.counterparty).toBe('Paystack');
    expect(result.alert.counterparty).not.toContain('PSST');
  });

  it('names a person on "Transfer from NAME", which has no slash to split', () => {
    // Regression: matched the transfer branch, found no slash segments, and
    // returned null — money from a named human filed as unattributed.
    const result = parseAccessBank(CREDITS.fromPerson);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.channel).toBe('transfer');
    expect(result.alert.counterparty).toBe('YETUNDE TEMILOLA OLUYOMBO');
    expect(result.alert.valueDate).toBe('2026-07-21');
  });

  it('keeps a hyphenated name intact', () => {
    const result = parseAccessBank(CREDITS.fromHyphenatedPerson);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alert.counterparty).toBe('ABDUL-HAMEED AREMU MUSTAPHA');
  });

  it('reconciles exactly, because fees are charged on debits only', () => {
    // 192,273.50 + 4,825.00 = 197,098.50, the next alert's balance to the kobo.
    // Debits show gaps of 10.75 and 50.00 at the same points; credits show none.
    const first = parseAccessBank(CREDITS.paystackA);
    const second = parseAccessBank(CREDITS.paystackB);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    const before = first.alert.balanceKobo;
    const after = second.alert.balanceKobo;
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    if (before === null || after === null) return;

    expect(before + second.alert.amountKobo).toBe(after);
  });
});
