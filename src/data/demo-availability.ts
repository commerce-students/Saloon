/**
 * Deterministic mock "already booked" data.
 *
 * The demo needs days that are partly full so the calendar looks alive, but the
 * numbers must not change on every render (a slot that disappears when you
 * refresh looks broken). A seeded pseudo-random generator keyed on the date
 * gives stable, repeatable results — no database required.
 */

import { minutesToTime, timeToMinutes } from '@/lib/booking/date';
import type { DateKey } from '@/lib/booking/date';
import type { BusyPeriod, WorkingHours } from '@/lib/booking/types';

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLOCK_LENGTHS = [30, 45, 60, 90];

/**
 * Existing appointments for a given date, aligned to the 30-minute grid so a
 * range of service durations all collide with them realistically.
 */
export function demoBusyPeriods(
  dateKey: DateKey,
  workingHours: WorkingHours[],
  slotIntervalMinutes = 30,
): BusyPeriod[] {
  const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  const day = workingHours.find((entry) => entry.weekday === weekday);
  if (!day) return [];

  const random = mulberry32(hashString(dateKey));
  const busy: BusyPeriod[] = [];

  for (const session of day.sessions) {
    const sessionStart = timeToMinutes(session.startTime);
    const sessionEnd = timeToMinutes(session.endTime);

    for (let start = sessionStart; start + 30 <= sessionEnd; start += slotIntervalMinutes) {
      if (random() > 0.42) continue;

      const length = BLOCK_LENGTHS[Math.floor(random() * BLOCK_LENGTHS.length)] ?? 60;
      const end = Math.min(start + length, sessionEnd);
      if (end - start < 30) continue;

      const clashes = busy.some((entry) => {
        const busyStart = timeToMinutes(entry.startTime);
        const busyEnd = timeToMinutes(entry.endTime);
        return start < busyEnd && busyStart < end;
      });
      if (clashes) continue;

      busy.push({
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
        appointmentId: `demo-${dateKey}-${start}`, // marks it as mock data
        staffId: null,
      });
    }
  }

  return busy;
}

export function demoBusyByDate(
  dateKeys: DateKey[],
  workingHours: WorkingHours[],
): Record<DateKey, BusyPeriod[]> {
  const map: Record<DateKey, BusyPeriod[]> = {};
  for (const dateKey of dateKeys) {
    map[dateKey] = demoBusyPeriods(dateKey, workingHours);
  }
  return map;
}
