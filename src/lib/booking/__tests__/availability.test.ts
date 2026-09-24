import { describe, expect, it } from 'vitest';

import {
  findAlternativeSlots,
  findNextAvailableDate,
  getDayAvailability,
  getMonthAvailability,
  getSlotsForDay,
  isSlotBookable,
  type AvailabilityContext,
} from '../availability';
import type { BlockedPeriod, BusyPeriod, WorkingHours } from '../types';

const workingHours: WorkingHours[] = [
  { weekday: 1, sessions: [{ startTime: '10:00', endTime: '13:00' }] }, // Monday morning
  { weekday: 2, sessions: [{ startTime: '10:00', endTime: '13:00' }] }, // Tuesday morning
];

function context(overrides: Partial<AvailabilityContext> = {}): AvailabilityContext {
  return {
    durationMinutes: 60,
    workingHours,
    blockedPeriods: [],
    busyByDate: {},
    // Monday 5 January 2026, 09:00 clinic time.
    now: { dateKey: '2026-01-05', minutes: 9 * 60 },
    rules: {
      slotIntervalMinutes: 30,
      leadTimeMinutes: 120,
      horizonDays: 60,
      turnoverMinutes: 0,
    },
    ...overrides,
  };
}

describe('getSlotsForDay', () => {
  it('offers every 30-minute start that fits the session', () => {
    const slots = getSlotsForDay('2026-01-06', context());
    // 10:00–13:00 with a 60-minute appointment: 10:00, 10:30, 11:00, 11:30, 12:00
    expect(slots.map((slot) => slot.startTime)).toEqual([
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
    ]);
    expect(slots.every((slot) => slot.available)).toBe(true);
    expect(slots[0]?.endTime).toBe('11:00');
  });

  it('returns nothing when the clinic is closed', () => {
    // Friday 9 January 2026 is not in the working hours above.
    expect(getSlotsForDay('2026-01-09', context())).toEqual([]);
  });

  it('marks clashing appointments as booked but keeps them visible', () => {
    const busy: BusyPeriod[] = [{ startTime: '10:00', endTime: '11:00', appointmentId: 'a1' }];
    const slots = getSlotsForDay('2026-01-06', context({ busyByDate: { '2026-01-06': busy } }));

    const ten = slots.find((slot) => slot.startTime === '10:00');
    const half = slots.find((slot) => slot.startTime === '10:30');
    const eleven = slots.find((slot) => slot.startTime === '11:00');

    expect(ten?.available).toBe(false);
    expect(ten?.reason).toBe('booked');
    expect(half?.available).toBe(false);
    expect(eleven?.available).toBe(true);
  });

  it('respects the lead time on the current day', () => {
    // Early in the day (07:00 + 120 minutes lead time) the whole morning is open.
    const early = getSlotsForDay(
      '2026-01-05',
      context({ now: { dateKey: '2026-01-05', minutes: 7 * 60 } }),
    );
    expect(early.filter((slot) => slot.available).map((slot) => slot.startTime)).toEqual([
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
    ]);

    // From 11:00 with a 2-hour notice period nothing in the morning is bookable.
    const late = getSlotsForDay(
      '2026-01-05',
      context({ now: { dateKey: '2026-01-05', minutes: 11 * 60 } }),
    );
    expect(late.some((slot) => slot.available)).toBe(false);
    expect(late.find((slot) => slot.startTime === '12:00')?.reason).toBe('past');
  });

  it('blocks every slot on a closed day', () => {
    const holidays: BlockedPeriod[] = [
      { id: 'h1', dateKey: '2026-01-06', startTime: null, endTime: null },
    ];
    const slots = getSlotsForDay('2026-01-06', context({ blockedPeriods: holidays }));
    expect(slots.every((slot) => !slot.available)).toBe(true);
    expect(slots.every((slot) => slot.reason === 'blocked')).toBe(true);
  });

  it('blocks part of a day for a team meeting', () => {
    const training: BlockedPeriod[] = [
      { id: 'b1', dateKey: '2026-01-06', startTime: '10:00', endTime: '12:00' },
    ];
    const slots = getSlotsForDay('2026-01-06', context({ blockedPeriods: training }));

    expect(slots.find((slot) => slot.startTime === '10:00')?.reason).toBe('blocked');
    expect(slots.find((slot) => slot.startTime === '11:00')?.reason).toBe('blocked');
    // 12:00–13:00 still fits inside the session.
    expect(slots.find((slot) => slot.startTime === '12:00')?.available).toBe(true);
  });

  it('applies the turnover buffer after an existing appointment', () => {
    const busy: BusyPeriod[] = [{ startTime: '10:00', endTime: '11:00', appointmentId: 'a1' }];
    const slots = getSlotsForDay(
      '2026-01-06',
      context({
        busyByDate: { '2026-01-06': busy },
        rules: {
          slotIntervalMinutes: 30,
          leadTimeMinutes: 120,
          horizonDays: 60,
          turnoverMinutes: 15,
        },
      }),
    );

    // The 15-minute buffer means 11:00 is no longer reachable for a 60-minute slot.
    expect(slots.find((slot) => slot.startTime === '11:00')?.available).toBe(false);
    expect(slots.find((slot) => slot.startTime === '11:30')?.available).toBe(true);
  });

  it('ignores the appointment being rescheduled', () => {
    const busy: BusyPeriod[] = [{ startTime: '10:00', endTime: '11:00', appointmentId: 'mine' }];
    const slots = getSlotsForDay(
      '2026-01-06',
      context({
        busyByDate: { '2026-01-06': busy },
        ignoreAppointmentId: 'mine',
      }),
    );
    expect(slots.find((slot) => slot.startTime === '10:00')?.available).toBe(true);
  });

  it('marks slots beyond the booking horizon as unbookable', () => {
    // 2026-06-01 is outside the 60-day window that starts on 2026-01-05.
    const far = getSlotsForDay('2026-06-01', context());
    expect(far.length).toBeGreaterThan(0);
    expect(far.every((slot) => !slot.available)).toBe(true);
    expect(far.every((slot) => slot.reason === 'closed')).toBe(true);
  });
});

describe('isSlotBookable', () => {
  it('accepts an available slot and reports its end time', () => {
    const result = isSlotBookable('2026-01-06', '10:00', context());
    expect(result.bookable).toBe(true);
    expect(result.endTime).toBe('11:00');
  });

  it('rejects a slot that does not exist on the grid', () => {
    const result = isSlotBookable('2026-01-06', '10:15', context());
    expect(result.bookable).toBe(false);
  });

  it('rejects a slot that clashes with an existing appointment', () => {
    const busy: BusyPeriod[] = [{ startTime: '10:00', endTime: '11:00', appointmentId: 'a1' }];
    const result = isSlotBookable(
      '2026-01-06',
      '10:00',
      context({ busyByDate: { '2026-01-06': busy } }),
    );
    expect(result.bookable).toBe(false);
    expect(result.reason).toBe('booked');
  });
});

describe('getDayAvailability', () => {
  it('counts the remaining bookable slots', () => {
    const busy: BusyPeriod[] = [{ startTime: '10:00', endTime: '11:00', appointmentId: 'a1' }];
    const day = getDayAvailability('2026-01-06', context({ busyByDate: { '2026-01-06': busy } }));
    expect(day.slots).toHaveLength(5);
    expect(day.availableCount).toBe(3);
    expect(day.isOpen).toBe(true);
  });

  it('reports a closed day as not open', () => {
    const day = getDayAvailability('2026-01-09', context());
    expect(day.isOpen).toBe(false);
    expect(day.availableCount).toBe(0);
  });
});

describe('getMonthAvailability', () => {
  it('flags upcoming days and empty days', () => {
    const days = getMonthAvailability(2026, 0, context());
    expect(days).toHaveLength(31);

    const monday = days.find((day) => day.dateKey === '2026-01-12');
    expect(monday?.isSelectable).toBe(true);

    const friday = days.find((day) => day.dateKey === '2026-01-09');
    expect(friday?.isOpen).toBe(false);
    expect(friday?.isSelectable).toBe(false);

    const past = days.find((day) => day.dateKey === '2026-01-01');
    expect(past?.isPast).toBe(true);
    expect(past?.isSelectable).toBe(false);
  });
});

describe('findNextAvailableDate', () => {
  it('skips closed days and fully booked days', () => {
    const busy: BusyPeriod[] = [
      { startTime: '10:00', endTime: '13:00', appointmentId: 'a1' }, // fills Monday 5th
    ];
    const next = findNextAvailableDate(context({ busyByDate: { '2026-01-05': busy } }));
    expect(next).toBe('2026-01-06');
  });

  it('returns null when everything within the horizon is full', () => {
    const next = findNextAvailableDate(
      context({
        workingHours: [],
      }),
    );
    expect(next).toBeNull();
  });
});

describe('findAlternativeSlots', () => {
  it('suggests bookable times from the requested date onwards', () => {
    const busy: BusyPeriod[] = [{ startTime: '10:00', endTime: '11:00', appointmentId: 'a1' }];
    const alternatives = findAlternativeSlots(
      '2026-01-06',
      context({ busyByDate: { '2026-01-06': busy } }),
      3,
    );
    expect(alternatives.map((slot) => slot.startTime)).toEqual(['11:00', '11:30', '12:00']);
  });
});
