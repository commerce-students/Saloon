/**
 * Availability engine.
 *
 * Pure functions: given working hours, blocked periods and existing
 * appointments, they decide which slots can be booked. No I/O, so the same
 * logic is used by the demo backend (browser) today and can be reused by the
 * Supabase backend / SQL functions later.
 */

import type { ClinicClock } from './date';
import { addDays, dateKeyToUtc, isTimeKey, minutesToTime, timeToMinutes, weekdayOf } from './date';
import type { DateKey, TimeKey } from './date';
import type {
  BlockedPeriod,
  BusyPeriod,
  DayAvailability,
  Slot,
  SlotUnavailableReason,
  WorkingHours,
} from './types';

export interface AvailabilityRules {
  slotIntervalMinutes: number;
  leadTimeMinutes: number;
  horizonDays: number;
  /** Buffer added after every existing appointment (cleaning / turnaround). */
  turnoverMinutes: number;
}

export interface AvailabilityContext {
  /** Duration of the service being booked. */
  durationMinutes: number;
  workingHours: WorkingHours[];
  blockedPeriods: BlockedPeriod[];
  /** Existing appointments keyed by date. */
  busyByDate: Record<DateKey, BusyPeriod[]>;
  now: ClinicClock;
  rules: AvailabilityRules;
  /** Ignore this appointment when calculating (used while rescheduling). */
  ignoreAppointmentId?: string;
  /** Restrict availability to a single staff member. */
  staffId?: string | null;
}

interface Interval {
  start: number;
  end: number;
}

function sessionsFor(dateKey: DateKey, ctx: AvailabilityContext): Interval[] {
  const weekday = weekdayOf(dateKey);
  const day = ctx.workingHours.find((entry) => entry.weekday === weekday);
  if (!day) return [];
  return day.sessions.map((session) => ({
    start: timeToMinutes(session.startTime),
    end: timeToMinutes(session.endTime),
  }));
}

function busyIntervalsFor(dateKey: DateKey, ctx: AvailabilityContext): Interval[] {
  const appointments = (ctx.busyByDate[dateKey] ?? []).filter((busy) => {
    if (ctx.ignoreAppointmentId && busy.appointmentId === ctx.ignoreAppointmentId) return false;
    if (ctx.staffId && busy.staffId && busy.staffId !== ctx.staffId) return false;
    return true;
  });

  return appointments.map((busy) => ({
    start: timeToMinutes(busy.startTime),
    end: timeToMinutes(busy.endTime) + ctx.rules.turnoverMinutes,
  }));
}

function blockedIntervalsFor(dateKey: DateKey, ctx: AvailabilityContext): Interval[] {
  return ctx.blockedPeriods
    .filter((block) => block.dateKey === dateKey)
    .filter((block) => !(ctx.staffId && block.staffId && block.staffId !== ctx.staffId))
    .map((block) => ({
      start: block.startTime ? timeToMinutes(block.startTime) : 0,
      end: block.endTime ? timeToMinutes(block.endTime) : 24 * 60,
    }));
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

function isWholeDayBlock(block: BlockedPeriod): boolean {
  return block.startTime === null || block.endTime === null;
}

/** `true` when the clinic is closed for the whole day. */
export function isClosedOn(dateKey: DateKey, ctx: AvailabilityContext): boolean {
  if (sessionsFor(dateKey, ctx).length === 0) return true;
  return ctx.blockedPeriods
    .filter((block) => block.dateKey === dateKey && isWholeDayBlock(block))
    .some((block) => !(ctx.staffId && block.staffId && block.staffId !== ctx.staffId));
}

/** How many days ahead of `from` (inclusive) are within the booking horizon. */
export function isWithinHorizon(dateKey: DateKey, ctx: AvailabilityContext): boolean {
  const lastBookable = addDays(ctx.now.dateKey, ctx.rules.horizonDays);
  return dateKeyToUtc(dateKey).getTime() <= dateKeyToUtc(lastBookable).getTime();
}

export function isInThePast(dateKey: DateKey, ctx: AvailabilityContext): boolean {
  return dateKeyToUtc(dateKey).getTime() < dateKeyToUtc(ctx.now.dateKey).getTime();
}

/**
 * Slots offered for a date. Slots that are already taken are still returned —
 * marked `available: false` — so the customer can see that the time exists but
 * is not bookable (which is far clearer than the slot silently vanishing).
 */
export function getSlotsForDay(dateKey: DateKey, ctx: AvailabilityContext): Slot[] {
  const duration = ctx.durationMinutes;
  if (!Number.isFinite(duration) || duration <= 0) return [];

  const sessions = sessionsFor(dateKey, ctx);
  if (sessions.length === 0) return [];

  const blocked = blockedIntervalsFor(dateKey, ctx);
  const busy = busyIntervalsFor(dateKey, ctx);
  const past = isInThePast(dateKey, ctx);
  const beyondHorizon = !isWithinHorizon(dateKey, ctx);
  const wholeDayBlocked = blocked.some((interval) => interval.start === 0 && interval.end >= 1440);

  const slots: Slot[] = [];
  const seen = new Set<number>();

  for (const session of sessions) {
    for (
      let start = session.start;
      start + duration <= session.end;
      start += ctx.rules.slotIntervalMinutes
    ) {
      if (seen.has(start)) continue;
      seen.add(start);

      const interval: Interval = { start, end: start + duration };
      let reason: SlotUnavailableReason | undefined;

      if (beyondHorizon) {
        reason = 'closed';
      } else if (past) {
        reason = 'past';
      } else if (
        dateKey === ctx.now.dateKey &&
        start < ctx.now.minutes + ctx.rules.leadTimeMinutes
      ) {
        reason = 'past';
      } else if (wholeDayBlocked || blocked.some((block) => overlaps(interval, block))) {
        reason = 'blocked';
      } else if (busy.some((existing) => overlaps(interval, existing))) {
        reason = 'booked';
      }

      slots.push({
        startTime: minutesToTime(start),
        endTime: minutesToTime(start + duration),
        available: reason === undefined,
        reason,
      });
    }
  }

  return slots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function getDayAvailability(dateKey: DateKey, ctx: AvailabilityContext): DayAvailability {
  const slots = getSlotsForDay(dateKey, ctx);
  return {
    dateKey,
    isOpen: slots.length > 0 && !isClosedOn(dateKey, ctx),
    availableCount: slots.filter((slot) => slot.available).length,
    slots,
  };
}

export interface MonthDay {
  dateKey: DateKey;
  isOpen: boolean;
  isSelectable: boolean;
  availableCount: number;
  isToday: boolean;
  isPast: boolean;
  isBeyondHorizon: boolean;
}

/** Day-by-day summary used to decorate the month calendar. */
export function getMonthAvailability(
  year: number,
  monthIndex: number,
  ctx: AvailabilityContext,
): MonthDay[] {
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const days: MonthDay[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isPast = isInThePast(dateKey, ctx);
    const beyondHorizon = !isWithinHorizon(dateKey, ctx);
    const closed = isClosedOn(dateKey, ctx);
    const availableCount =
      isPast || beyondHorizon || closed
        ? 0
        : getSlotsForDay(dateKey, ctx).filter((slot) => slot.available).length;

    days.push({
      dateKey,
      isOpen: !closed,
      isSelectable: availableCount > 0,
      availableCount,
      isToday: dateKey === ctx.now.dateKey,
      isPast,
      isBeyondHorizon: beyondHorizon,
    });
  }

  return days;
}

/** First date with at least one bookable slot — used to open the calendar. */
export function findNextAvailableDate(
  ctx: AvailabilityContext,
  maxDaysToSearch = 120,
): DateKey | null {
  for (let offset = 0; offset <= maxDaysToSearch; offset += 1) {
    const dateKey = addDays(ctx.now.dateKey, offset);
    if (!isWithinHorizon(dateKey, ctx)) return null;
    if (getSlotsForDay(dateKey, ctx).some((slot) => slot.available)) return dateKey;
  }
  return null;
}

/** Validates a requested slot against the current rules and bookings. */
export function isSlotBookable(
  dateKey: DateKey,
  startTime: TimeKey,
  ctx: AvailabilityContext,
): { bookable: boolean; reason?: SlotUnavailableReason; endTime?: TimeKey } {
  if (!isTimeKey(startTime)) return { bookable: false, reason: 'closed' };
  const slot = getSlotsForDay(dateKey, ctx).find((entry) => entry.startTime === startTime);
  if (!slot) return { bookable: false, reason: 'closed' };
  return slot.available
    ? { bookable: true, endTime: slot.endTime }
    : { bookable: false, reason: slot.reason, endTime: slot.endTime };
}

/** The next few bookable slots after a date, offered when a slot is taken. */
export function findAlternativeSlots(
  dateKey: DateKey,
  ctx: AvailabilityContext,
  limit = 4,
): Slot[] {
  const alternatives: Slot[] = [];

  for (let offset = 0; offset <= 14 && alternatives.length < limit; offset += 1) {
    const candidate = addDays(dateKey, offset);
    if (!isWithinHorizon(candidate, ctx)) break;
    for (const slot of getSlotsForDay(candidate, ctx)) {
      if (!slot.available) continue;
      alternatives.push(slot);
      if (alternatives.length >= limit) break;
    }
  }

  return alternatives;
}
