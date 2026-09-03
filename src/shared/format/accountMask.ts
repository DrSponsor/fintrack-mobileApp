/**
 * Presenting a masked account number.
 *
 * ── The leak this closes ─────────────────────────────────────────────────
 * A mask reaches the client in one of two shapes, depending on what the bank
 * printed:
 *
 *   012******345    the bank masked it, and we kept its asterisks
 *   #######772      the bank printed it in full, and WE masked it
 *
 * The second is this app's own redaction glyph, chosen server-side so a full
 * account number never reaches a third-party model. It was never meant to be
 * read by a person, and on screen it looks like a rendering fault rather than
 * a concealed number — which is exactly how it looked in Settings.
 *
 * So both are normalised to the asterisk a bank would have used. Nothing about
 * the number changes: the same digits stay visible, the same digits stay
 * hidden, and the row stops advertising an implementation detail.
 */

/** Every glyph a mask might use to stand for a hidden digit. */
const MASK_GLYPHS = /[#•·x]/gi;

/** What a bank prints, and therefore what a person expects to see. */
const AS_PRINTED = '*';

export function formatAccountMask(mask: string): string {
  return mask.replace(MASK_GLYPHS, AS_PRINTED);
}
