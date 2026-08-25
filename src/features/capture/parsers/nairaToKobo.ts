/**
 * Parses a naira figure from alert text into bigint minor units.
 *
 * ── Why this is not parseFloat ───────────────────────────────────────────
 * `parseFloat('4989.25') * 100` is 498924.99999999994. Rounding hides it at
 * one value and not at another, so the bug surfaces as a single transaction
 * being one kobo out, months later, in a total nobody can reconcile. Money
 * never touches a float anywhere in this app — the backend stores minor units,
 * formatKoboToNaira renders from bigint, and parsing is the remaining door
 * through which a float could get in.
 *
 * So the split is done on the STRING: digits before the point become naira,
 * digits after become kobo, and both are converted with BigInt.
 */

/** Matches a whole-naira part with optional 1-2 decimal places. */
const FIGURE = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * @param text figure as printed, e.g. "1,234.56", "NGN50,000.00", "1600"
 * @returns minor units, or null if the text is not a well-formed figure
 */
export function nairaToKobo(text: string): bigint | null {
  const cleaned = text
    .trim()
    // Currency marks appear inconsistently: "NGN1,234.56", "₦1,234.56", bare.
    .replace(/^(?:NGN|ngn|₦)\s*/u, '')
    .replace(/,/g, '');

  const match = FIGURE.exec(cleaned);
  if (match === null) return null;

  const whole = match[1];
  if (whole === undefined) return null;

  // padEnd, not padStart: "4989.5" is five naira fifty, not five kobo.
  const fraction = (match[2] ?? '').padEnd(2, '0');

  return BigInt(whole) * 100n + BigInt(fraction);
}
