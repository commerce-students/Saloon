import { bookingConfig } from '@/config/booking';
import { DEMO_SERVICES } from '@/data/services';
import { DEMO_WORKING_HOURS, demoBlockedPeriods } from '@/data/schedule';
import { demoBusyPeriods } from '@/data/demo-availability';

import { getDayAvailability, getMonthAvailability, findNextAvailableDate } from './availability';
import type { AvailabilityContext, MonthDay } from './availability';
import type { AvailabilityQuery, BookingBackend } from './backend';
import { addDays, clinicClock, isDateKey } from './date';
import type { DateKey } from './date';
import {
  createAppointmentId,
  createManageToken,
  createReferenceCode,
  normaliseReferenceCode,
  phonesMatch,
} from './ids';
import {
  findStoredByReference,
  findStoredByToken,
  readStoredAppointments,
  upsertStoredAppointment,
} from './demo-store';
import type {
  Appointment,
  BookingRequest,
  BookingResult,
  BusyPeriod,
  DayAvailability,
  LookupResult,
  RescheduleRequest,
  Service,
} from './types';

/**
 * In-browser backend used while Supabase is not configured.
 *
 * Behaviour mirrors the real thing on purpose: slots are validated again at the
 * moment of booking, taken slots return the next available alternatives, and
 * the management token is the only way to reach an appointment.
 */

/** Small delay so loading states are visible — the real backend has latency too. */
const SIMULATED_LATENCY_MS = 180;

function delay<T>(value: T, ms = SIMULATED_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getService(serviceId: string): Service | undefined {
  return DEMO_SERVICES.find((service) => service.id === serviceId);
}

/** Dates that matter for a query: the requested day plus the scheduling horizon. */
function dateRange(from: DateKey, days: number): DateKey[] {
  const keys: DateKey[] = [];
  for (let offset = 0; offset < days; offset += 1) keys.push(addDays(from, offset));
  return keys;
}

function busyForDates(dateKeys: DateKey[]): Record<DateKey, BusyPeriod[]> {
  const map: Record<DateKey, BusyPeriod[]> = {};
  const stored = readStoredAppointments();

  for (const dateKey of dateKeys) {
    const seeded = demoBusyPeriods(dateKey, DEMO_WORKING_HOURS, bookingConfig.slotIntervalMinutes);
    const booked = stored
      .filter(
        (appointment) =>
          appointment.dateKey === dateKey &&
          (appointment.status === 'pending' || appointment.status === 'confirmed'),
      )
      .map<BusyPeriod>((appointment) => ({
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        appointmentId: appointment.id,
        staffId: appointment.staffId,
      }));

    map[dateKey] = [...seeded, ...booked];
  }

  return map;
}

function buildContext(
  service: Service,
  options: { from: DateKey; days: number } & Pick<
    AvailabilityQuery,
    'ignoreAppointmentId' | 'staffId'
  >,
): AvailabilityContext {
  const now = clinicClock();
  const start = options.from < now.dateKey ? now.dateKey : options.from;

  return {
    durationMinutes: service.durationMinutes,
    workingHours: DEMO_WORKING_HOURS,
    blockedPeriods: demoBlockedPeriods(now.dateKey),
    busyByDate: busyForDates(dateRange(start, options.days)),
    now,
    rules: {
      slotIntervalMinutes: bookingConfig.slotIntervalMinutes,
      leadTimeMinutes: bookingConfig.leadTimeMinutes,
      horizonDays: bookingConfig.horizonDays,
      turnoverMinutes: bookingConfig.turnoverMinutes,
    },
    ignoreAppointmentId: options.ignoreAppointmentId,
    staffId: options.staffId ?? null,
  };
}

function notFound(message: string): LookupResult {
  return { ok: false, error: { code: 'not_found', message } };
}

const SERVICE_NOT_FOUND: BookingResult = {
  ok: false,
  error: {
    code: 'service_not_found',
    message: 'That service is no longer available. Please choose another treatment.',
  },
};

export function createDemoBackend(): BookingBackend {
  return {
    kind: 'demo',
    label: 'Demo mode — appointments are stored in this browser only',

    async listServices(): Promise<Service[]> {
      return delay(clone(DEMO_SERVICES.filter((service) => service.active)), 60);
    },

    async getDayAvailability(query: AvailabilityQuery): Promise<DayAvailability> {
      const service = getService(query.serviceId);
      if (!service || !isDateKey(query.dateKey)) {
        return { dateKey: query.dateKey, isOpen: false, availableCount: 0, slots: [] };
      }
      const context = buildContext(service, {
        from: query.dateKey,
        days: 1,
        ignoreAppointmentId: query.ignoreAppointmentId,
        staffId: query.staffId,
      });
      return delay(getDayAvailability(query.dateKey, context));
    },

    async getMonthAvailability(
      serviceId: string,
      year: number,
      monthIndex: number,
    ): Promise<MonthDay[]> {
      const service = getService(serviceId);
      if (!service) return delay([]);
      const firstOfMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const context = buildContext(service, { from: firstOfMonth, days: 33 });
      return delay(getMonthAvailability(year, monthIndex, context));
    },

    async findNextAvailableDate(serviceId: string, fromDateKey?: DateKey): Promise<DateKey | null> {
      const service = getService(serviceId);
      if (!service) return delay(null);
      const now = clinicClock();
      const start = fromDateKey && fromDateKey > now.dateKey ? fromDateKey : now.dateKey;
      const context = buildContext(service, {
        from: start,
        days: Math.min(bookingConfig.horizonDays + 1, 130),
      });
      return delay(findNextAvailableDate(context, bookingConfig.horizonDays), 80);
    },

    async createBooking(request: BookingRequest): Promise<BookingResult> {
      const service = getService(request.serviceId);
      if (!service) return delay(SERVICE_NOT_FOUND);

      const context = buildContext(service, { from: request.dateKey, days: 1 });
      const day = getDayAvailability(request.dateKey, context);
      const match = day.slots.find((entry) => entry.startTime === request.startTime);

      if (!match || !match.available) {
        return delay({
          ok: false,
          error: {
            code: match?.reason === 'past' ? 'invalid_input' : 'slot_unavailable',
            message:
              match?.reason === 'past'
                ? 'That time has just passed. Please choose a later slot.'
                : 'Sorry — that time was taken moments ago. Here are the next available slots.',
            suggestions: day.slots.filter((entry) => entry.available).slice(0, 4),
          },
        });
      }

      if (request.expectedEndTime && request.expectedEndTime !== match.endTime) {
        return delay({
          ok: false,
          error: {
            code: 'slot_unavailable',
            message: 'The appointment length changed. Please pick a time again.',
            suggestions: day.slots.filter((entry) => entry.available).slice(0, 4),
          },
        });
      }

      const now = new Date().toISOString();
      const customerId = `cus-${createAppointmentId()}`;
      const appointment: Appointment = {
        id: createAppointmentId(),
        referenceCode: createReferenceCode(),
        serviceId: service.id,
        serviceName: service.name,
        serviceDurationMinutes: service.durationMinutes,
        staffId: request.staffId ?? null,
        staffName: null,
        dateKey: request.dateKey,
        startTime: match.startTime,
        endTime: match.endTime,
        status: 'confirmed',
        notes: request.notes ?? null,
        customer: {
          id: customerId,
          name: request.customer.name,
          phone: request.customer.phone,
          email: request.customer.email ?? null,
        },
        manageToken: createManageToken(32),
        createdAt: now,
        updatedAt: now,
      };

      upsertStoredAppointment(appointment);
      return delay({ ok: true, appointment }, 420);
    },

    async getByToken(manageToken: string): Promise<LookupResult> {
      if (!manageToken || manageToken.length < 16) {
        return delay(notFound('That management link is not valid.'), 60);
      }
      const appointment = findStoredByToken(manageToken);
      if (!appointment) {
        return delay(
          notFound(
            'We could not find that appointment in this browser. Demo appointments are stored locally, so they are only available on the device they were booked from.',
          ),
          120,
        );
      }
      return delay({ ok: true, appointment: clone(appointment) });
    },

    async lookupByReference(referenceCode: string, phone: string): Promise<LookupResult> {
      const code = normaliseReferenceCode(referenceCode);
      const appointment = findStoredByReference(code);

      // Both the code and the phone number must match — never the code alone.
      if (!appointment || !phonesMatch(appointment.customer.phone, phone)) {
        return delay(
          notFound(
            'We could not match that reference with the mobile number provided. Please check both and try again, or use the secure link in your confirmation.',
          ),
          200,
        );
      }
      return delay({ ok: true, appointment: clone(appointment) });
    },

    async reschedule(request: RescheduleRequest): Promise<BookingResult> {
      const existing = findStoredByToken(request.manageToken);
      if (!existing) {
        return delay({
          ok: false,
          error: { code: 'not_found', message: 'That management link is not valid.' },
        });
      }
      if (existing.status === 'cancelled') {
        return delay({
          ok: false,
          error: {
            code: 'not_found',
            message: 'This appointment was cancelled. Please book a new appointment.',
          },
        });
      }

      const service = getService(existing.serviceId);
      if (!service) return delay(SERVICE_NOT_FOUND);

      const context = buildContext(service, {
        from: request.dateKey,
        days: 1,
        ignoreAppointmentId: existing.id,
      });
      const day = getDayAvailability(request.dateKey, context);
      const match = day.slots.find((entry) => entry.startTime === request.startTime);

      if (!match || !match.available) {
        return delay({
          ok: false,
          error: {
            code: 'slot_unavailable',
            message: 'That time is not available. Here is the next availability.',
            suggestions: day.slots.filter((entry) => entry.available).slice(0, 4),
          },
        });
      }

      const updated: Appointment = {
        ...existing,
        dateKey: request.dateKey,
        startTime: match.startTime,
        endTime: match.endTime,
        status: 'confirmed',
        updatedAt: new Date().toISOString(),
      };

      upsertStoredAppointment(updated);
      return delay({ ok: true, appointment: updated }, 420);
    },

    async cancel(manageToken: string): Promise<Appointment | null> {
      const existing = findStoredByToken(manageToken);
      if (!existing) return delay(null, 80);

      const updated: Appointment = {
        ...existing,
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      };
      upsertStoredAppointment(updated);
      return delay(updated, 320);
    },
  };
}
