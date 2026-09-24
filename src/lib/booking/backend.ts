/**
 * The contract every booking backend implements.
 *
 * The UI only ever talks to this interface, so switching from the mock backend
 * to Supabase (or to a custom API) is a configuration change, not a rewrite.
 */

import type { DateKey } from './date';
import type { MonthDay } from './availability';
import type {
  Appointment,
  BookingRequest,
  BookingResult,
  DayAvailability,
  LookupResult,
  RescheduleRequest,
  Service,
} from './types';

export type BookingBackendKind = 'demo' | 'supabase';

export interface AvailabilityQuery {
  serviceId: string;
  dateKey: DateKey;
  staffId?: string | null;
  /** Exclude one appointment (used when rescheduling it). */
  ignoreAppointmentId?: string;
}

export interface BookingBackend {
  readonly kind: BookingBackendKind;
  /** Human-readable description shown in the demo notice. */
  readonly label: string;

  listServices(): Promise<Service[]>;

  getDayAvailability(query: AvailabilityQuery): Promise<DayAvailability>;

  getMonthAvailability(
    serviceId: string,
    year: number,
    monthIndex: number,
    staffId?: string | null,
  ): Promise<MonthDay[]>;

  /** First bookable date, used to open the calendar on a useful month. */
  findNextAvailableDate(serviceId: string, fromDateKey?: DateKey): Promise<DateKey | null>;

  createBooking(request: BookingRequest): Promise<BookingResult>;

  getByToken(manageToken: string): Promise<LookupResult>;

  /** Customer self-service lookup: reference code + the phone used to book. */
  lookupByReference(referenceCode: string, phone: string): Promise<LookupResult>;

  reschedule(request: RescheduleRequest): Promise<BookingResult>;

  cancel(manageToken: string, reason?: string): Promise<Appointment | null>;
}

export class BackendNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendNotConfiguredError';
  }
}
