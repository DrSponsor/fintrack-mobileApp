import { maskDate, maskTime, readWhen } from './WhenSheet';

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

describe('typing with a numeric keypad', () => {
  // The keypad has no colon and no slash, so the first version of this sheet
  // could not be filled in at all. Only digits are ever pressed now.

  it('builds the time as digits arrive', () => {
    expect(maskTime('1')).toBe('1');
    expect(maskTime('14')).toBe('14');
    expect(maskTime('140')).toBe('14:0');
    expect(maskTime('1407')).toBe('14:07');
  });

  it('builds the date as digits arrive', () => {
    expect(maskDate('2')).toBe('2');
    expect(maskDate('22')).toBe('22');
    expect(maskDate('2208')).toBe('22/08');
    expect(maskDate('22082026')).toBe('22/08/2026');
  });

  it('keeps working once a separator is already there', () => {
    // Every keystroke re-derives the whole value, so the separator this
    // function inserted last time is stripped and re-inserted rather than
    // being counted as input.
    expect(maskTime('14:07')).toBe('14:07');
    expect(maskDate('22/08/2026')).toBe('22/08/2026');
  });

  it('deletes through a separator without a special case', () => {
    // Backspacing '14:0' leaves '14:' — the digits are '14', so the colon goes
    // with it rather than stranding the caret behind a character that cannot
    // be removed.
    expect(maskTime('14:')).toBe('14');
    expect(maskDate('22/')).toBe('22');
  });

  it('refuses more digits than the field can hold', () => {
    expect(maskTime('140799')).toBe('14:07');
    expect(maskDate('2208202699')).toBe('22/08/2026');
  });

  it('produces exactly what the parser accepts', () => {
    // The two halves have to agree, or a field could be filled in completely
    // and still be reported as badly formed.
    const read = readWhen(maskDate('22082026'), maskTime('1407'), new Date(2026, 8, 3));
    expect('at' in read).toBe(true);
  });
});
