import { readWhen } from './WhenSheet';

const NOW = new Date(2026, 8, 3, 18, 0, 0);

describe('readWhen', () => {
  it('reads a date and time a person would type', () => {
    const read = readWhen('22/08/2026', '14:07', NOW);

    expect('at' in read).toBe(true);
    if ('at' in read) {
      expect(read.at.getFullYear()).toBe(2026);
      expect(read.at.getMonth()).toBe(7);
      expect(read.at.getDate()).toBe(22);
      expect(read.at.getHours()).toBe(14);
      expect(read.at.getMinutes()).toBe(7);
    }
  });

  it('accepts single digits and stray spaces', () => {
    // Somebody typing quickly writes 2/8/2026, and the keyboard is numeric so
    // a space is easy to land on.
    expect('at' in readWhen(' 2/8/2026 ', ' 9:05 ', NOW)).toBe(true);
  });

  it('refuses a day that does not exist in that month', () => {
    // The one JavaScript silently accepts: new Date(2026, 1, 31) rolls forward
    // to 3 March without complaint, so a typo would file a payment eleven days
    // from where the person meant it.
    const read = readWhen('31/02/2026', '10:00', NOW);

    expect('problem' in read).toBe(true);
    if ('problem' in read) expect(read.problem).toContain('does not exist');
  });

  it('refuses a time that is in the future', () => {
    // A payment cannot have happened yet, and a future date would sort above
    // everything real in the ledger forever.
    const read = readWhen('04/09/2026', '10:00', NOW);

    expect('problem' in read).toBe(true);
    if ('problem' in read) expect(read.problem).toContain('future');
  });

  it('allows earlier today but not later today', () => {
    expect('at' in readWhen('03/09/2026', '17:59', NOW)).toBe(true);
    expect('problem' in readWhen('03/09/2026', '18:01', NOW)).toBe(true);
  });

  it('refuses more than two years back, where a typo is likelier than a memory', () => {
    const read = readWhen('22/08/2023', '14:07', NOW);

    expect('problem' in read).toBe(true);
    if ('problem' in read) expect(read.problem).toContain('Check the year');
  });

  it('refuses an impossible month, hour or minute', () => {
    expect('problem' in readWhen('22/13/2026', '10:00', NOW)).toBe(true);
    expect('problem' in readWhen('22/08/2026', '24:00', NOW)).toBe(true);
    expect('problem' in readWhen('22/08/2026', '10:60', NOW)).toBe(true);
  });

  it('explains the shape rather than silently guessing', () => {
    // Correcting "22-08-26" into something plausible is the kind of help that
    // files a payment on a day the person never named.
    const read = readWhen('22-08-26', '14:07', NOW);

    expect('problem' in read).toBe(true);
    if ('problem' in read) expect(read.problem).toContain('day/month/year');
  });

  it('refuses a time with no minutes', () => {
    expect('problem' in readWhen('22/08/2026', '14', NOW)).toBe(true);
  });
});
