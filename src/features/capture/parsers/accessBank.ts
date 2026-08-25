/**
 * Access Bank alert parser.
 *
 * Written against real alerts from a live account, not an invented format.
 * A representative message:
 *
 *     Debit
 *     Amt:NGN1,234.56
 *     Acc:012******345
 *     Desc:312ABCD2600000AA/MOBILE TRF TO PAY/ /MARY OKAFOR ROE
 *     Date:05/03/2026
 *     Avail Bal:NGN50,000.00
 *     Total:NGN2
 *
 * ── Four things the real corpus taught that guesswork would not ──────────
 *
 * 1. `Total:` IS ALWAYS TRUNCATED, and is deliberately never read. Across five
 *    samples it arrived as "NGN2", "NGN209", "NGN57,890.0" — the SMS hits its
 *    length limit and the final field is whatever survived. It also merely
 *    repeats `Avail Bal`, so nothing is lost by ignoring it. A parser that
 *    trusted it would report a ₦57,890 balance as ₦2, and would do so only on
 *    the longest messages.
 *
 * 2. THE DATE IS DD/MM/YYYY. "05/03/2026" settles it — 17 cannot be a month.
 *    Parsed by explicit field, never handed to `new Date(string)`, which would
 *    read it as US MM/DD and silently produce a wrong date for every day of the
 *    month past the twelfth.
 *
 * 3. THE BALANCE DOES NOT RECONCILE BY SUBTRACTION, so `Avail Bal` is treated
 *    as authoritative rather than derived. Consecutive alerts show gaps of
 *    ₦10.75 and ₦50.00 beyond the stated amounts — Nigerian transfer levy and
 *    electronic-money stamp duty, charged as their OWN separate alerts. Any
 *    running total computed by summing transactions drifts by exactly those
 *    fees.
 *
 * 4. THE NARRATIVE IS A SLASH-DELIMITED COMPOUND, and the merchant is not
 *    where a naive split would put it. "WEB PYMT +14152360599 +14152360599
 *    00US" has a phone number where a merchant name belongs, and a trailing
 *    country token; "MOBILE TRF TO PAY/ /MARY OKAFOR ROE" hides the
 *    counterparty behind an empty segment.
 *
 * ── What the credit samples then corrected ───────────────────────────────
 * The credit path was initially written from the format's symmetry, and real
 * credit alerts broke it immediately — in a way worth recording, because the
 * failure was silent rather than loud. Inbound alerts use narrative forms that
 * share no keyword with outbound ones:
 *
 *     Desc:312WXYZ2600001BC/Paystack/PSST00SAMPLE0000000001
 *     Desc:312WXYZ2600003BE/Transfer from MARY OKAFOR ROE
 *
 * The first carries no TRF or TRANSFER token anywhere, so it fell through every
 * branch to `unknown`. The second matched the transfer branch but has no slash
 * to split, so the counterparty came back null. Neither threw; both produced a
 * confidently wrong result. Money arriving from a named human would have been
 * filed as an unattributed "unknown".
 *
 * Outbound puts the counterparty LAST behind an empty segment, inbound puts it
 * FIRST or after the word "from". There is no single rule; both are handled.
 *
 * ── An asymmetry worth knowing ───────────────────────────────────────────
 * Credits reconcile exactly — consecutive inbound balances differ by precisely
 * the stated amount. Only debits carry the levy and stamp-duty gaps described
 * in note 3. Fees are charged on money leaving, never on money arriving.
 */
import { nairaToKobo } from './nairaToKobo';
import type { Channel, Direction, ParseResult, ParsedAlert } from './types';

export const ACCESS_BANK = 'access-bank';

/**
 * Recognises an Access Bank alert with enough confidence to attempt a parse.
 * Deliberately structural — the field names — rather than matching a sender id,
 * which varies by network and is trivially spoofed.
 */
export function looksLikeAccessBank(text: string): boolean {
  return /^\s*(?:Debit|Credit)\s*$/im.test(text) && /^\s*Amt\s*:/im.test(text);
}

function field(text: string, key: string): string | null {
  const pattern = new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, 'im');
  const match = pattern.exec(text);
  return match?.[1] ?? null;
}

function readDirection(text: string): Direction | null {
  if (/^\s*Debit\s*$/im.test(text)) return 'debit';
  if (/^\s*Credit\s*$/im.test(text)) return 'credit';
  return null;
}

/** DD/MM/YYYY → YYYY-MM-DD. Returns null rather than a wrong date. */
function readValueDate(raw: string | null): string | null {
  if (raw === null) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim());
  if (match === null) return null;

  const [, day, month, year] = match;
  if (day === undefined || month === undefined || year === undefined) return null;

  const dayNum = Number(day);
  const monthNum = Number(month);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;

  return `${year}-${month}-${day}`;
}

/** A bare figure standing in for a reference or a phone number. */
const NUMERIC_TOKEN = /^\+?\d{6,}$/;
/** Trailing "00NG" / "00US" — two digits then ISO country. */
const COUNTRY_TOKEN = /^\d{2}([A-Z]{2})$/;
/**
 * A machine-generated reference: one unbroken alphanumeric run of ten or more.
 * The length floor is what keeps a real name out — "Paystack" is eight, and a
 * counterparty name almost always contains a space.
 */
const REFERENCE_LIKE = /^[A-Za-z0-9]{10,}$/;

function splitSegments(description: string): string[] {
  return description
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

interface Narrative {
  readonly channel: Channel;
  readonly text: string;
  readonly counterparty: string | null;
  readonly country: string | null;
}

function readNarrative(description: string): Narrative {
  const upper = description.toUpperCase();

  // Fees first. They arrive as their own alerts, and misfiling one as spending
  // would double-count the transaction that caused it.
  if (/\b(VAT|STAMP\s*DUTY|LEVY|COMMISSION|CHARGE|FEE)\b/.test(upper)) {
    return { channel: 'fee', text: description, counterparty: null, country: null };
  }

  if (/\bMOBILE\s+TRF\b|\bTRF\b|\bTRANSFER\b/.test(upper)) {
    // Inbound: "Transfer from MARY OKAFOR ROE". Checked BEFORE the
    // slash form, because this one has no slashes at all and would otherwise
    // fall through to a null counterparty.
    const inbound = /\b(?:transfer|trf)\s+from\s+(.+)$/i.exec(description);
    const inboundName = inbound?.[1]?.trim();
    if (inboundName !== undefined && inboundName.length > 0) {
      return { channel: 'transfer', text: description, counterparty: inboundName, country: null };
    }

    // Outbound: "MOBILE TRF TO PAY/ /MARY OKAFOR ROE" — the counterparty
    // is the LAST non-empty slash segment. The empty segment between the
    // slashes is a real part of the format, not a parsing artefact.
    const segments = splitSegments(description);
    const last = segments[segments.length - 1] ?? null;
    // Guard against a transfer whose only segment is the label itself.
    const counterparty = segments.length > 1 ? last : null;
    return { channel: 'transfer', text: description, counterparty, country: null };
  }

  if (/\bWEB\s+PYMT\b|\bWEB\s+PAYMENT\b/.test(upper)) {
    const body = description.replace(/^\s*WEB\s+(?:PYMT|PAYMENT)\s*/i, '');
    const tokens = body.split(/\s+/).filter((token) => token.length > 0);

    let country: string | null = null;
    const lastToken = tokens[tokens.length - 1];
    if (lastToken !== undefined) {
      const countryMatch = COUNTRY_TOKEN.exec(lastToken.toUpperCase());
      if (countryMatch?.[1] !== undefined) {
        country = countryMatch[1];
        tokens.pop();
      }
    }

    // Drop ONE trailing bare number — the acquirer reference. Only when
    // something else remains, so "+14152360599 +14152360599" keeps the phone
    // number that is doing duty as the merchant name.
    const trailing = tokens[tokens.length - 1];
    if (tokens.length > 1 && trailing !== undefined && NUMERIC_TOKEN.test(trailing)) {
      tokens.pop();
    }

    const merchant = tokens.join(' ').trim();
    return {
      channel: 'web',
      text: description,
      counterparty: merchant.length > 0 ? merchant : null,
      country,
    };
  }

  if (/\bPOS\b/.test(upper)) {
    return { channel: 'pos', text: description, counterparty: null, country: null };
  }
  if (/\bATM\b/.test(upper)) {
    return { channel: 'atm', text: description, counterparty: null, country: null };
  }

  // "Paystack/PSST00SAMPLE0000000001" — a source name followed by that
  // source's own opaque reference, with no keyword anywhere to key on. This is
  // how NIP credits from payment processors arrive, and it is the form that
  // silently produced `unknown` before real credit samples existed.
  //
  // Matched structurally: exactly two segments, where the second reads as a
  // machine reference (one long alphanumeric run, no spaces) and the first does
  // not. The counterparty is the FIRST segment here — the opposite end from
  // outbound transfers.
  const segments = splitSegments(description);
  const [source, tail] = segments;
  if (
    segments.length === 2 &&
    source !== undefined &&
    tail !== undefined &&
    REFERENCE_LIKE.test(tail) &&
    !REFERENCE_LIKE.test(source)
  ) {
    return { channel: 'transfer', text: description, counterparty: source, country: null };
  }

  return { channel: 'unknown', text: description, counterparty: null, country: null };
}

export function parseAccessBank(raw: string): ParseResult {
  const direction = readDirection(raw);
  if (direction === null) {
    return { ok: false, reason: 'no Debit/Credit line', raw };
  }

  const amountText = field(raw, 'Amt');
  if (amountText === null) {
    return { ok: false, reason: 'no Amt field', raw };
  }

  const amountKobo = nairaToKobo(amountText);
  if (amountKobo === null) {
    return { ok: false, reason: `unreadable amount: ${amountText}`, raw };
  }

  // `Avail Bal`, never `Total` — see note 1 in the header.
  const balanceText = field(raw, 'Avail Bal');
  const balanceKobo = balanceText === null ? null : nairaToKobo(balanceText);

  const description = field(raw, 'Desc') ?? '';
  // "312ABCD2600000AA/MOBILE TRF TO PAY/ /MARY OKAFOR ROE"
  // The reference is everything before the first slash, when it looks like one.
  const slash = description.indexOf('/');
  const candidate = slash > 0 ? description.slice(0, slash) : '';
  const hasReference = /^[A-Z0-9]{8,}$/i.test(candidate);
  const reference = hasReference ? candidate : null;
  const remainder = hasReference ? description.slice(slash + 1) : description;

  const narrative = readNarrative(remainder);

  const alert: ParsedAlert = {
    issuer: ACCESS_BANK,
    direction,
    channel: narrative.channel,
    amountKobo,
    balanceKobo,
    accountMask: field(raw, 'Acc'),
    reference,
    narrative: narrative.text,
    counterparty: narrative.counterparty,
    country: narrative.country,
    valueDate: readValueDate(field(raw, 'Date')),
    raw,
  };

  return { ok: true, alert };
}
