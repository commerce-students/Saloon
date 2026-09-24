import type { BlockedPeriod, WorkingHours } from '@/lib/booking/types';
import { addDays } from '@/lib/booking/date';
import type { DateKey } from '@/lib/booking/date';

/**
 * ⚠️  PLACEHOLDER OPENING HOURS — CONFIRM WITH THE CLINIC
 *
 * These hours are an editable demo default (a typical Muscat clinic pattern:
 * morning and evening sessions, closed on Friday). They are NOT confirmed
 * clinic information. Replace them here, or manage them in the Supabase
 * `working_hours` / `blocked_periods` tables once the backend is connected.
 */
export const DEMO_WORKING_HOURS: WorkingHours[] = [
  // Saturday – Thursday: 10:00–13:00 and 16:00–20:00
  ...[6, 0, 1, 2, 3, 4].map((weekday) => ({
    weekday,
    sessions: [
      { startTime: '10:00', endTime: '13:00' },
      { startTime: '16:00', endTime: '20:00' },
    ],
  })),
];

/**
 * A sample clinic closure so the calendar demonstrably renders days off.
 * Replace with the clinic's real holidays / staff days off.
 */
export function demoBlockedPeriods(today: DateKey): BlockedPeriod[] {
  return [
    {
      id: 'block-demo-holiday',
      dateKey: addDays(today, 9),
      startTime: null,
      endTime: null,
      reason: 'Clinic closure (sample placeholder)',
    },
    {
      id: 'block-demo-training',
      dateKey: addDays(today, 16),
      startTime: '10:00',
      endTime: '13:00',
      reason: 'Team training (sample placeholder)',
    },
  ];
}
