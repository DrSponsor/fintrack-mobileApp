import {
  maskDate,
  maskTime,
  readWhen,
  toTwentyFourHour,
  meridiemOf,
  twelveHourOf,
} from './WhenSheet';

const NOW = new Date(2026, 8, 3, 18, 0, 0);

describe('readWhen', () => {
  it('reads a date and time a person would type', () => {
    const read = readWhen('22/08/2026', '2:07', 'pm', NOW);

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
    expect('at' in readWhen(' 2/8/2026 ', ' 9:05 ', 'am', NOW)).toBe(true);
  });

  it('refuses a day that does not exist in that month', () => {
    // The one JavaScript silently accepts: new Date(2026, 1, 31) rolls forward
    // to 3 March without complaint, so a typo would file a payment eleven days
    // from where the person meant it.
    const read = readWhen('31/02/2026', '10:00', 'am', NOW);

    expect('problem' in read).toBe(true);
    if ('problem' in read) expect(read.problem).toContain('does not exist');
  });

  it('refuses a time that is in the future', () => {
    // A payment cannot have happened yet, and a future date would sort above
    // everything real in the ledger forever.
    const read = readWhen('04/09/2026', '10:00', 'am', NOW);

    expect('problem' in read).toBe(true);
    if ('problem' in read) expect(read.problem).toContain('future');
  });

  it('allows earlier today but not later today', () => {
    expect('at' in readWhen('03/09/2026', '5:59', 'pm', NOW)).toBe(true);
    expect('problem' in readWhen('03/09/2026', '6:01', 'pm', NOW)).toBe(true);
  });

  it('refuses more than two years back, where a typo is likelier than a memory', () => {
    const read = readWhen('22/08/2023', '2:07', 'pm', NOW);

    expect('problem' in read).toBe(true);
    if ('problem' in read) expect(read.problem).toContain('Check the year');
  });

  it('refuses an hour outside 1 to 12, which is the 24-hour habit showing', () => {
    const read = readWhen('22/08/2026', '14:07', 'pm', NOW);

    expect('problem' in read).toBe(true);
    if ('problem' in read) expect(read.problem).toContain('1 to 12');
  });

  it('refuses an impossible month, hour or minute', () => {
    expect('problem' in readWhen('22/13/2026', '10:00', 'am', NOW)).toBe(true);
    expect('problem' in readWhen('22/08/2026', '13:00', 'pm', NOW)).toBe(true);
    expect('problem' in readWhen('22/08/2026', '10:60', 'am', NOW)).toBe(true);
  });

  it('explains the shape rather than silently guessing', () => {
    // Correcting "22-08-26" into something plausible is the kind of help that
    // files a payment on a day the person never named.
    const read = readWhen('22-08-26', '2:07', 'pm', NOW);

    expect('problem' in read).toBe(true);
    if ('problem' in read) expect(read.problem).toContain('day/month/year');
  });

  it('refuses a time with no minutes', () => {
    expect('problem' in readWhen('22/08/2026', '2', 'pm', NOW)).toBe(true);
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
    const read = readWhen(maskDate('22082026'), maskTime('0207'), 'pm', new Date(2026, 8, 3));
    expect('at' in read).toBe(true);
  });
});

describe('the twelve-hour clock', () => {
  // The two every implementation gets wrong, because neither is "add twelve".
  it('reads 12 am as midnight and 12 pm as noon', () => {
    expect(toTwentyFourHour(12, 'am')).toBe(0);
    expect(toTwentyFourHour(12, 'pm')).toBe(12);
  });

  it('leaves morning hours alone and shifts afternoon ones', () => {
    expect(toTwentyFourHour(1, 'am')).toBe(1);
    expect(toTwentyFourHour(11, 'am')).toBe(11);
    expect(toTwentyFourHour(1, 'pm')).toBe(13);
    expect(toTwentyFourHour(11, 'pm')).toBe(23);
  });

  it('files an afternoon payment in the afternoon', () => {
    // The bug this whole change exists to prevent: meaning two in the
    // afternoon, typing 2, and landing twelve hours away.
    const read = readWhen('22/08/2026', '2:07', 'pm', NOW);

    expect('at' in read).toBe(true);
    if ('at' in read) expect(read.at.getHours()).toBe(14);
  });

  it('seeds the control from the value the sheet opens on', () => {
    // A control that always opened on am would move the same twelve-hour
    // error from a mistyped hour to an unread toggle.
    expect(meridiemOf(new Date(2026, 7, 22, 0, 30))).toBe('am');
    expect(meridiemOf(new Date(2026, 7, 22, 11, 59))).toBe('am');
    expect(meridiemOf(new Date(2026, 7, 22, 12, 0))).toBe('pm');
    expect(meridiemOf(new Date(2026, 7, 22, 23, 59))).toBe('pm');
  });

  it('seeds the hour as a person reads it, never as 0', () => {
    expect(twelveHourOf(new Date(2026, 7, 22, 0, 30))).toBe(12);
    expect(twelveHourOf(new Date(2026, 7, 22, 12, 30))).toBe(12);
    expect(twelveHourOf(new Date(2026, 7, 22, 13, 0))).toBe(1);
    expect(twelveHourOf(new Date(2026, 7, 22, 9, 0))).toBe(9);
  });

  it('survives a round trip through the seed and back', () => {
    for (const hour of [0, 1, 11, 12, 13, 23]) {
      const at = new Date(2026, 7, 22, hour, 15);
      expect(toTwentyFourHour(twelveHourOf(at), meridiemOf(at))).toBe(hour);
    }
  });
});
