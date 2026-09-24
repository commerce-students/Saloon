/** Booking rules. All values are overridable through environment variables. */

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const bookingConfig = {
  /** Granularity of the time grid offered in the calendar (minutes). */
  slotIntervalMinutes: readNumber(process.env.NEXT_PUBLIC_BOOKING_SLOT_INTERVAL, 30),
  /** Minimum notice before the earliest bookable slot (minutes). */
  leadTimeMinutes: readNumber(process.env.NEXT_PUBLIC_BOOKING_LEAD_TIME, 120),
  /** How far into the future customers may book (days). */
  horizonDays: readNumber(process.env.NEXT_PUBLIC_BOOKING_HORIZON_DAYS, 60),
  /** A buffer added after every appointment before the next one may start. */
  turnoverMinutes: 0,
} as const;
