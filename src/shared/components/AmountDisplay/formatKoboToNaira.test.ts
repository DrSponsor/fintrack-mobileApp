import { formatKoboToNaira } from './AmountDisplay';

describe('formatKoboToNaira', () => {
  test.each<[bigint, string]>([
    [0n, '₦0.00'],
    [100n, '₦1.00'],
    [100000n, '₦1,000.00'],
    [5000000n, '₦50,000.00'],
    [-100000n, '-₦1,000.00'],
    [5n, '₦0.05'],
    [12345n, '₦123.45'],
    [123456789n, '₦1,234,567.89'],
    [-5n, '-₦0.05'],
    [1n, '₦0.01'],
  ])('formatKoboToNaira(%sn) === %s', (kobo, expected) => {
    expect(formatKoboToNaira(kobo)).toBe(expected);
  });

  it('never loses precision for large amounts (pure BigInt math, no float conversion)', () => {
    // A value well beyond Number.MAX_SAFE_INTEGER (2^53 - 1) — this would
    // silently lose precision if the implementation ever converted to a
    // JS `number` at any point. ₦92,233,720,368,547,758.07 in kobo.
    const largeKobo = 9223372036854775807n;
    expect(formatKoboToNaira(largeKobo)).toBe('₦92,233,720,368,547,758.07');
  });
});
