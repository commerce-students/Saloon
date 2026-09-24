/**
 * Time-zone-safe date helpers.
 *
 * The clinic operates in a single time zone (`Asia/Muscat`, UTC+4, no daylight
 * saving). Calendar dates are therefore handled as plain `YYYY-MM-DD` strings
 * ("date keys") and never as JavaScript `Date`s in the visitor's local zone —
 * which is the classic source of "my appointment shows the day before" bugs.
 */

import { CLINIC_TIME_ZONE } from '@/config/clinic';

/** A calendar date in the clinic time zone, formatted `YYYY-MM-DD`. */
export type DateKey = string;
/** A wall-clock time in the clinic time zone, formatted `HH:mm` (24-hour). */
export type TimeKey = string;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_KEY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isDateKey(value: unknown): value is DateKey {
  return typeof value === 'string' && DATE_KEY_PATTERN.test(value);
}

export function isTimeKey(value: unknown): value is TimeKey {
  return typeof value === 'string' && TIME_KEY_PATTERN.test(value);
}

const clinicFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export interface ClinicClock {
  dateKey: DateKey;
  /** Minutes since midnight, clinic time. */
  minutes: number;
}

/** Current date + time as observed in the clinic's time zone. */
export function clinicClock(now: Date = new Date()): ClinicClock {
  const parts = clinicFormatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(hour) * 60 + Number(get('minute')),
  };
}

export function todayKey(now: Date = new Date()): DateKey {
  return clinicClock(now).dateKey;
}

/** Converts a date key into a UTC-midnight `Date` (safe for calendar maths). */
export function dateKeyToUtc(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

/** Converts a `Date` (interpreted in UTC) back into a date key. */
export function utcToDateKey(date: Date): DateKey {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Day of week for a date key. `0` = Sunday … `6` = Saturday. */
export function weekdayOf(key: DateKey): number {
  return dateKeyToUtc(key).getUTCDay();
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = dateKeyToUtc(key);
  date.setUTCDate(date.getUTCDate() + days);
  return utcToDateKey(date);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: DateKey, to: DateKey): number {
  const ms = dateKeyToUtc(to).getTime() - dateKeyToUtc(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function isSameMonth(a: DateKey, b: DateKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

// --- Time helpers -----------------------------------------------------------

export function timeToMinutes(time: TimeKey): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function minutesToTime(minutes: number): TimeKey {
  const normalised = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalised / 60)).padStart(2, '0')}:${String(
    normalised % 60,
  ).padStart(2, '0')}`;
}

/** `"10:30"` → `"10:30 AM"` (what customers see on the time grid). */
export function formatTime(time: TimeKey, locale = 'en-US'): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(Date.UTC(2020, 0, 1, hours ?? 0, minutes ?? 0));
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = `${hours} hr${hours > 1 ? 's' : ''}`;
  return rest === 0 ? hourLabel : `${hourLabel} ${rest} min`;
}

// --- Display formatting -----------------------------------------------------

/** `"2026-05-12"` → `"Tuesday, 12 May 2026"`. */
export function formatDateLong(key: DateKey, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateKeyToUtc(key));
}

/** `"2026-05-12"` → `"Tue 12 May"`. */
export function formatDateMedium(key: DateKey, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(dateKeyToUtc(key));
}

/** `"2026-05-12"` → `"12 May 2026"`. */
export function formatDateShort(key: DateKey, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateKeyToUtc(key));
}

/** `"2026-05-12"` → `"May 2026"`. */
export function formatMonthLabel(year: number, monthIndex: number, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

/** Weekday names, Sunday first. */
export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WEEKDAY_SHORT_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Converts a clinic wall-clock date/time into the real UTC instant.
 *
 * Works for any target time zone (and any future daylight-saving rule) by
 * measuring the zone offset with `Intl` instead of assuming a fixed +04:00.
 */
export function clinicDateTimeToUtc(key: DateKey, time: TimeKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  const naiveUtc = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0);
  // `offset` is in minutes; `naiveUtc` is in milliseconds.
  const offsetMs = clinicOffsetMinutes(new Date(naiveUtc)) * 60_000;
  return new Date(naiveUtc - offsetMs);
}

/** Offset of the clinic time zone from UTC, in minutes, at a given instant. */
function clinicOffsetMinutes(instant: Date): number {
  const parts = clinicFormatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'),
  );

  return Math.round((asIfUtc - instant.getTime()) / 60_000);
}

/** `YYYYMMDDTHHMMSSZ` — the format Google Calendar and iCalendar files expect. */
export function formatUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

export function formatDateKeyAndTime(
  key: DateKey,
  time: TimeKey,
  locale = 'en-GB',
): { date: string; time: string } {
  return { date: formatDateLong(key, locale), time: formatTime(time, locale) };
}
