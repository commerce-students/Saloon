import { describe, expect, it } from 'vitest';

import {
  addDays,
  clinicClock,
  clinicDateTimeToUtc,
  dateKeyToUtc,
  daysBetween,
  formatDateLong,
  formatDateMedium,
  formatDuration,
  formatTime,
  formatUtcStamp,
  isDateKey,
  isTimeKey,
  minutesToTime,
  timeToMinutes,
  todayKey,
  utcToDateKey,
  weekdayOf,
} from '../date';

describe('date keys', () => {
  it('validates date keys', () => {
    expect(isDateKey('2026-01-05')).toBe(true);
    expect(isDateKey('2026-1-5')).toBe(false);
    expect(isDateKey('05/01/2026')).toBe(false);
    expect(isDateKey(20260105)).toBe(false);
  });

  it('validates time keys', () => {
    expect(isTimeKey('09:30')).toBe(true);
    expect(isTimeKey('23:59')).toBe(true);
    expect(isTimeKey('24:00')).toBe(false);
    expect(isTimeKey('9:30')).toBe(false);
  });

  it('round-trips date keys through UTC dates', () => {
    const key = '2026-03-29';
    expect(utcToDateKey(dateKeyToUtc(key))).toBe(key);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    // 2028 is a leap year.
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-01-05', '2026-01-08')).toBe(3);
    expect(daysBetween('2026-01-08', '2026-01-05')).toBe(-3);
  });

  it('reports weekday numbers with Sunday as 0', () => {
    expect(weekdayOf('2026-01-04')).toBe(0); // Sunday
    expect(weekdayOf('2026-01-05')).toBe(1); // Monday
    expect(weekdayOf('2026-01-09')).toBe(5); // Friday
  });
});

describe('clinic time zone handling', () => {
  it('reads the clinic clock from a UTC instant', () => {
    // 2026-01-05T05:30:00Z is 09:30 in Muscat (UTC+4).
    const clock = clinicClock(new Date('2026-01-05T05:30:00Z'));
    expect(clock.dateKey).toBe('2026-01-05');
    expect(clock.minutes).toBe(9 * 60 + 30);
  });

  it('rolls the clinic date forward late in the UTC day', () => {
    // 2026-01-05T22:15:00Z is 02:15 on the 6th in Muscat.
    const clock = clinicClock(new Date('2026-01-05T22:15:00Z'));
    expect(clock.dateKey).toBe('2026-01-06');
    expect(clock.minutes).toBe(2 * 60 + 15);
  });

  it('produces a date key for today', () => {
    expect(isDateKey(todayKey(new Date('2026-07-01T10:00:00Z')))).toBe(true);
  });

  it('converts clinic wall-clock times to the correct UTC instant', () => {
    const utc = clinicDateTimeToUtc('2026-01-06', '10:00');
    expect(utc.toISOString()).toBe('2026-01-06T06:00:00.000Z');
  });

  it('formats UTC stamps for calendar files', () => {
    expect(formatUtcStamp(new Date('2026-01-06T06:00:00.000Z'))).toBe('20260106T060000Z');
  });
});

describe('time formatting', () => {
  it('converts between time keys and minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('10:30')).toBe(630);
    expect(timeToMinutes('23:59')).toBe(1439);
    expect(minutesToTime(630)).toBe('10:30');
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('formats times for the interface', () => {
    expect(formatTime('10:00')).toBe('10:00 AM');
    expect(formatTime('12:30')).toBe('12:30 PM');
    expect(formatTime('16:45')).toBe('4:45 PM');
  });

  it('formats durations in a readable way', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatDuration(120)).toBe('2 hrs');
  });

  it('formats long and medium dates', () => {
    expect(formatDateLong('2026-01-06')).toBe('Tuesday, 6 January 2026');
    expect(formatDateMedium('2026-01-06')).toBe('Tue 6 Jan');
  });
});
