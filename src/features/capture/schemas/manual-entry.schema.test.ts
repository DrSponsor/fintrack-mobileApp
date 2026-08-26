/**
 * The form's refusals.
 *
 * These mirror the backend's rules so a mistake is caught while the user is
 * still looking at the field that caused it. The server enforces all of it
 * again — this copy exists for the user, not the database — so a gap here is a
 * usability bug rather than a hole.
 */
import { manualEntrySchema } from './manual-entry.schema';

const HOUR_MS = 60 * 60 * 1000;

function makeEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    amount: '5000',
    direction: 'DEBIT',
    merchantName: 'Shoprite',
    when: new Date(Date.now() - HOUR_MS),
    accountId: '11111111-1111-4111-8111-111111111111',
    ...overrides,
  };
}

describe('manualEntrySchema', () => {
  it('accepts an ordinary entry', () => {
    expect(manualEntrySchema.safeParse(makeEntry()).success).toBe(true);
  });

  it('accepts an amount written with separators', () => {
    // Pasted from a bank alert, or typed by someone who groups as they go.
    expect(manualEntrySchema.safeParse(makeEntry({ amount: '1,234.56' })).success).toBe(true);
  });

  it('accepts a category when one is chosen', () => {
    const result = manualEntrySchema.safeParse(
      makeEntry({ categoryId: '22222222-2222-4222-8222-222222222222' }),
    );
    expect(result.success).toBe(true);
  });

  describe('refuses', () => {
    const cases: readonly (readonly [string, Record<string, unknown>])[] = [
      ['an empty amount', makeEntry({ amount: '' })],
      ['a zero amount', makeEntry({ amount: '0' })],
      ['an amount that is not a figure', makeEntry({ amount: 'abc' })],
      // Two extra keystrokes on a phone keypad is the likeliest way a balance
      // gets poisoned, so the ceiling is a typo guard rather than a limit.
      ['an implausibly large amount', makeEntry({ amount: '99999999999' })],
      ['a missing merchant', makeEntry({ merchantName: '   ' })],
      // Normalises to an empty fingerprint, which would then match every other
      // punctuation-only name in the shared merchant map.
      ['a merchant of pure punctuation', makeEntry({ merchantName: '---' })],
      ['a time that has not happened yet', makeEntry({ when: new Date(Date.now() + 48 * HOUR_MS) })],
      ['a date far enough back to be a mis-set picker', makeEntry({ when: new Date('1990-01-01') })],
      ['no account', makeEntry({ accountId: '' })],
    ];

    for (const [label, entry] of cases) {
      it(label, () => {
        expect(manualEntrySchema.safeParse(entry).success).toBe(false);
      });
    }
  });
});
