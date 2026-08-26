/**
 * What the amount field lets through.
 *
 * A keypad is not the only way text reaches this input — paste, autofill and
 * some Android keyboards all bypass `keyboardType`. So the guard is on the
 * value, not the keyboard, and this pins it: whatever arrives, what comes out
 * must be something nairaToKobo can read exactly, because a figure it cannot
 * parse becomes a silently rejected entry and a figure it misreads becomes
 * wrong money.
 */
import { sanitiseAmountInput } from './AmountField';
import { nairaToKobo } from '../parsers/nairaToKobo';

describe('sanitiseAmountInput', () => {
  it('keeps a plain figure untouched', () => {
    expect(sanitiseAmountInput('5000')).toBe('5000');
    expect(sanitiseAmountInput('1234.56')).toBe('1234.56');
  });

  it('drops separators rather than blocking them', () => {
    // Pasting "₦1,234.56" out of a bank alert has to work, and rejecting the
    // paste wholesale would be a worse answer than accepting the number in it.
    expect(sanitiseAmountInput('₦1,234.56')).toBe('1234.56');
    expect(sanitiseAmountInput('NGN 5 000')).toBe('5000');
  });

  it('keeps only the first decimal point', () => {
    // A stray second point would make the whole figure unparseable, so the
    // field silently keeps the first one instead of discarding the keystroke.
    expect(sanitiseAmountInput('12.34.56')).toBe('12.34');
  });

  it('never allows more than two decimal places', () => {
    // Kobo is the smallest unit there is. A third place is either a typo or a
    // value that cannot be represented, and both should stop at the input.
    expect(sanitiseAmountInput('12.345')).toBe('12.34');
  });

  it('leaves a trailing point alone while it is being typed', () => {
    // Mid-keystroke state: "12." is on the way to "12.5", and rewriting it
    // would fight the user.
    expect(sanitiseAmountInput('12.')).toBe('12.');
  });

  it('produces something nairaToKobo can read exactly', () => {
    const cases: readonly (readonly [string, bigint])[] = [
      ['5000', 500_000n],
      ['₦1,234.56', 123_456n],
      ['0.05', 5n],
      // padEnd, not padStart: "4989.5" is five naira fifty, not five kobo.
      ['4989.5', 498_950n],
    ];

    for (const [raw, expected] of cases) {
      expect(nairaToKobo(sanitiseAmountInput(raw))).toBe(expected);
    }
  });

  it('reduces text with no figure in it to nothing', () => {
    expect(sanitiseAmountInput('abc')).toBe('');
    expect(nairaToKobo(sanitiseAmountInput('abc'))).toBeNull();
  });
});
