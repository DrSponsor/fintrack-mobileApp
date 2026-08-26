/**
 * Validation for the manual entry form.
 *
 * Mirrors the backend's rules so a mistake is caught while the user is still
 * looking at the field that caused it, rather than after a round trip. The
 * server still enforces all of this — this copy is for the user's benefit, not
 * the database's.
 */
import { z } from 'zod';
import { nairaToKobo } from '../parsers/nairaToKobo';

/**
 * ₦9,999,999,999.99 in kobo. A typo guard rather than a storage limit: two
 * extra keystrokes on a phone keypad turn ₦5,000 into ₦500,000, and a balance
 * poisoned by a fat-fingered entry is worse than a rejected one.
 */
export const MAX_AMOUNT_KOBO = 999_999_999_999n;

/** Ten years back. Anything older is a mis-set picker, not a memory. */
const OLDEST_PLAUSIBLE_MS = 10 * 365 * 24 * 60 * 60 * 1000;

export const manualEntrySchema = z.object({
  /**
   * Held as the string the user typed, not a number. Money never touches a
   * float in this app; nairaToKobo splits on the decimal point and converts
   * each side with BigInt.
   */
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((value) => nairaToKobo(value) !== null, 'That is not an amount')
    .refine((value) => (nairaToKobo(value) ?? 0n) > 0n, 'Enter an amount above zero')
    .refine(
      (value) => (nairaToKobo(value) ?? 0n) <= MAX_AMOUNT_KOBO,
      'That amount looks too large — please check it',
    ),
  direction: z.enum(['DEBIT', 'CREDIT']),
  merchantName: z
    .string()
    .trim()
    .min(1, 'Who was this with?')
    .max(100, 'That name is too long')
    // A name of pure punctuation normalises to an empty fingerprint, which
    // would then match every other punctuation-only name in the shared merchant
    // map. Require something a fingerprint can be built on.
    .refine((value) => /[a-zA-Z0-9]/.test(value), 'Enter a name with at least one letter or number'),
  when: z
    .date()
    .refine((value) => value.getTime() <= Date.now() + 60_000, 'That time has not happened yet')
    .refine((value) => value.getTime() >= Date.now() - OLDEST_PLAUSIBLE_MS, 'That date is too far back'),
  accountId: z.string().uuid('Choose an account'),
  categoryId: z.string().uuid().optional(),
});

export type ManualEntryFormData = z.infer<typeof manualEntrySchema>;
