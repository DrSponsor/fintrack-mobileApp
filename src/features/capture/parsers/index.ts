/**
 * Issuer registry.
 *
 * Parsers are tried in order and the first that recognises the text wins.
 * Recognition is structural (field names, message shape) rather than based on
 * the sender id, which varies by network and is trivially spoofed.
 *
 * An unrecognised alert is NOT an error and must never be discarded — the raw
 * text is preserved so a later parser version can reprocess it. The set of
 * issuers a real user receives is unknowable in advance, so "we do not handle
 * this yet" has to be an ordinary, recorded state.
 */
import { looksLikeAccessBank, parseAccessBank } from './accessBank';
import type { ParseResult } from './types';

interface Issuer {
  readonly id: string;
  readonly recognises: (text: string) => boolean;
  readonly parse: (text: string) => ParseResult;
}

const ISSUERS: readonly Issuer[] = [
  { id: 'access-bank', recognises: looksLikeAccessBank, parse: parseAccessBank },
];

export function parseAlert(text: string): ParseResult {
  for (const issuer of ISSUERS) {
    if (issuer.recognises(text)) {
      return issuer.parse(text);
    }
  }
  return { ok: false, reason: 'no issuer recognised this message', raw: text };
}

export { ACCESS_BANK, looksLikeAccessBank, parseAccessBank } from './accessBank';
export { nairaToKobo } from './nairaToKobo';
export type {
  Channel,
  Direction,
  ParseFailure,
  ParseResult,
  ParseSuccess,
  ParsedAlert,
} from './types';
