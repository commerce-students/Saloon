import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';

import { BackendNotConfiguredError } from './backend';
import type { AvailabilityQuery, BookingBackend } from './backend';
import type { MonthDay } from './availability';
import { clinicClock, todayKey } from './date';
import type { DateKey } from './date';
import { normaliseReferenceCode } from './ids';
import {
  mapAppointment,
  mapService,
  mapSlot,
  SERVICE_SELECT_COLUMNS,
  toDateKey,
  toNumber,
  type AppointmentRow,
  type ServiceRow,
  type SlotRow,
} from './supabase-mappers';
import type {
  Appointment,
  BookingRequest,
  BookingResult,
  DayAvailability,
  LookupResult,
  RescheduleRequest,
  Service,
} from './types';

/**
 * Supabase backend.
 *
 * Every call goes through a database function (`supabase/schema.sql`), which:
 *   • re-computes availability from the real calendar (hours, breaks, days off,
 *     blocked time, existing appointments and service duration);
 *   • writes appointments inside a transaction with an exclusion constraint, so
 *     two customers can never take the same slot even under a race;
 *   • returns only the fields a customer is allowed to see.
 *
 * The column-level security means the anon key in the browser is safe: it
 * cannot read another customer's appointment, and management lookups require
 * the unguessable token (or reference + matching phone) for that appointment.
 */

function requireClient(): SupabaseClient {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new BackendNotConfiguredError(
      'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return client;
}

/** Maps a Postgres error raised by the booking functions to a UI-friendly error. */
function mapRpcError(message: string): BookingResult {
  const normalised = message.toUpperCase();

  if (normalised.includes('SLOT_UNAVAILABLE')) {
    return {
      ok: false,
      error: {
        code: 'slot_unavailable',
        message: 'Sorry — that time was taken moments ago. Please choose another slot.',
      },
    };
  }
  if (normalised.includes('SERVICE_NOT_FOUND')) {
    return {
      ok: false,
      error: { code: 'service_not_found', message: 'That service is no longer available.' },
    };
  }
  if (normalised.includes('CLOSED')) {
    return {
      ok: false,
      error: {
        code: 'closed',
        message: 'The clinic is closed on that day. Please pick another date.',
      },
    };
  }
  if (normalised.includes('INVALID_INPUT')) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: 'Please check your details and try again.' },
    };
  }
  return {
    ok: false,
    error: {
      code: 'unknown',
      message: 'We could not complete that request. Please try again in a moment.',
    },
  };
}

export function createSupabaseBackend(): BookingBackend {
  return {
    kind: 'supabase',
    label: 'Connected to Supabase',

    async listServices(): Promise<Service[]> {
      const { data, error } = await requireClient()
        .from('services')
        .select(SERVICE_SELECT_COLUMNS)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) throw new Error(error.message);
      return ((data ?? []) as ServiceRow[]).map(mapService);
    },

    async getDayAvailability(query: AvailabilityQuery): Promise<DayAvailability> {
      const { data, error } = await requireClient().rpc('get_day_availability', {
        p_service_id: query.serviceId,
        p_date: query.dateKey,
        p_staff_id: query.staffId ?? null,
      });

      if (error) throw new Error(error.message);

      const slots = ((data ?? []) as SlotRow[]).map(mapSlot);
      return {
        dateKey: query.dateKey,
        isOpen: slots.length > 0,
        availableCount: slots.filter((slot) => slot.available).length,
        slots,
      };
    },

    async getMonthAvailability(
      serviceId: string,
      year: number,
      monthIndex: number,
    ): Promise<MonthDay[]> {
      const month = String(monthIndex + 1).padStart(2, '0');
      const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
      const from = `${year}-${month}-01`;
      const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await requireClient().rpc('get_month_availability', {
        p_service_id: serviceId,
        p_from: from,
        p_to: to,
      });

      if (error) throw new Error(error.message);

      const now = clinicClock();
      const rows = (data ?? []) as Array<{
        day: string;
        is_open: boolean;
        available_count: number;
      }>;

      return rows.map<MonthDay>((row) => {
        const dateKey = toDateKey(row.day);
        const availableCount = toNumber(row.available_count);
        return {
          dateKey,
          isOpen: row.is_open === true,
          availableCount,
          isSelectable: availableCount > 0,
          isToday: dateKey === now.dateKey,
          isPast: dateKey < now.dateKey,
          isBeyondHorizon: false,
        };
      });
    },

    async findNextAvailableDate(serviceId: string, fromDateKey?: DateKey): Promise<DateKey | null> {
      const { data, error } = await requireClient().rpc('get_next_available_date', {
        p_service_id: serviceId,
        p_from: fromDateKey ?? todayKey(),
      });

      if (error) throw new Error(error.message);
      const value = typeof data === 'string' ? data : null;
      return value ? toDateKey(value) : null;
    },

    async createBooking(request: BookingRequest): Promise<BookingResult> {
      const { data, error } = await requireClient().rpc('create_appointment', {
        p_service_id: request.serviceId,
        p_date: request.dateKey,
        p_start_time: request.startTime,
        p_customer_name: request.customer.name,
        p_customer_phone: request.customer.phone,
        p_customer_email: request.customer.email ?? null,
        p_notes: request.notes ?? null,
        p_staff_id: request.staffId ?? null,
      });

      if (error) return mapRpcError(error.message);

      const row = (Array.isArray(data) ? data[0] : data) as AppointmentRow | null;
      if (!row) {
        return {
          ok: false,
          error: { code: 'unknown', message: 'The appointment could not be created.' },
        };
      }
      return { ok: true, appointment: mapAppointment(row) };
    },

    async getByToken(manageToken: string): Promise<LookupResult> {
      const { data, error } = await requireClient().rpc('get_appointment_by_token', {
        p_token: manageToken,
      });

      if (error) return mapRpcError(error.message) as LookupResult;

      const row = (Array.isArray(data) ? data[0] : data) as AppointmentRow | null;
      if (!row) {
        return {
          ok: false,
          error: {
            code: 'not_found',
            message: 'That management link is not valid or has expired.',
          },
        };
      }
      return { ok: true, appointment: mapAppointment(row, manageToken) };
    },

    async lookupByReference(referenceCode: string, phone: string): Promise<LookupResult> {
      const { data, error } = await requireClient().rpc('find_appointment_by_reference', {
        p_reference: normaliseReferenceCode(referenceCode),
        p_phone: phone,
      });

      if (error) return mapRpcError(error.message) as LookupResult;

      const row = (Array.isArray(data) ? data[0] : data) as AppointmentRow | null;
      if (!row) {
        return {
          ok: false,
          error: {
            code: 'not_found',
            message:
              'We could not match that reference with the mobile number provided. Please check both and try again.',
          },
        };
      }
      return { ok: true, appointment: mapAppointment(row) };
    },

    async reschedule(request: RescheduleRequest): Promise<BookingResult> {
      const { data, error } = await requireClient().rpc('reschedule_appointment', {
        p_token: request.manageToken,
        p_date: request.dateKey,
        p_start_time: request.startTime,
      });

      if (error) return mapRpcError(error.message);

      const row = (Array.isArray(data) ? data[0] : data) as AppointmentRow | null;
      if (!row) {
        return {
          ok: false,
          error: { code: 'not_found', message: 'That management link is not valid.' },
        };
      }
      return { ok: true, appointment: mapAppointment(row, request.manageToken) };
    },

    async cancel(manageToken: string): Promise<Appointment | null> {
      const { data, error } = await requireClient().rpc('cancel_appointment', {
        p_token: manageToken,
      });

      if (error) return null;
      const row = (Array.isArray(data) ? data[0] : data) as AppointmentRow | null;
      return row ? mapAppointment(row, manageToken) : null;
    },
  };
}
