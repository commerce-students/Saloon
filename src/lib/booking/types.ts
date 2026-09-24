/** Domain types shared by the booking UI, the demo backend and Supabase. */

import type { DateKey, TimeKey } from './date';

export interface Service {
  id: string;
  name: string;
  description: string;
  /** Length of the appointment in minutes. */
  durationMinutes: number;
  /** Price in the clinic's local currency, or `null` when not published. */
  price: number | null;
  currency: string;
  /** Optional grouping used on the services section. */
  category?: string;
  active: boolean;
  /**
   * `true` for the clearly-labelled demo catalogue shipped with this template.
   * Replace with real services (and set this to `false`) before going live.
   */
  isPlaceholder: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  active: boolean;
}

/** Recurring weekly opening hours for one weekday. */
export interface WorkingHours {
  /** `0` = Sunday … `6` = Saturday. */
  weekday: number;
  /** Opening periods, usually a morning and an evening session. */
  sessions: Array<{ startTime: TimeKey; endTime: TimeKey }>;
}

/** A one-off closure: holidays, clinic days off or an internal booking. */
export interface BlockedPeriod {
  id: string;
  dateKey: DateKey;
  /** `null` start/end means the whole day is blocked. */
  startTime: TimeKey | null;
  endTime: TimeKey | null;
  reason?: string;
  /** Restricts the block to a single staff member when set. */
  staffId?: string | null;
}

/** An existing appointment, as needed by the availability engine. */
export interface BusyPeriod {
  startTime: TimeKey;
  endTime: TimeKey;
  appointmentId?: string;
  staffId?: string | null;
}

export type AppointmentStatus =
  'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
}

export interface Appointment {
  id: string;
  /** Short human-readable code, e.g. `CBS-7Q4K2`. */
  referenceCode: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  staffId: string | null;
  staffName: string | null;
  dateKey: DateKey;
  startTime: TimeKey;
  endTime: TimeKey;
  status: AppointmentStatus;
  notes: string | null;
  customer: { id: string; name: string; phone: string; email: string | null };
  /** Unguessable token that authorises the management page. */
  manageToken: string;
  createdAt: string;
  updatedAt: string;
}

export type SlotUnavailableReason = 'past' | 'booked' | 'blocked' | 'closing-soon' | 'closed';

export interface Slot {
  startTime: TimeKey;
  endTime: TimeKey;
  available: boolean;
  reason?: SlotUnavailableReason;
}

export interface DayAvailability {
  dateKey: DateKey;
  isOpen: boolean;
  /** Number of bookable slots remaining — powers the calendar dots. */
  availableCount: number;
  slots: Slot[];
}

export interface BookingRequest {
  serviceId: string;
  dateKey: DateKey;
  startTime: TimeKey;
  staffId?: string | null;
  customer: { name: string; phone: string; email?: string | null };
  notes?: string | null;
  /** Set by the UI so the backend can reject a slot that silently changed. */
  expectedEndTime?: TimeKey;
}

export type BookingErrorCode =
  | 'service_not_found'
  | 'invalid_input'
  | 'slot_unavailable'
  | 'not_found'
  | 'closed'
  | 'expired'
  | 'network'
  | 'not_configured'
  | 'unknown';

export interface BookingError {
  code: BookingErrorCode;
  message: string;
  /** Other slots the customer could pick instead. */
  suggestions?: Slot[];
}

export type BookingResult =
  { ok: true; appointment: Appointment } | { ok: false; error: BookingError };

export type LookupResult =
  { ok: true; appointment: Appointment } | { ok: false; error: BookingError };

export interface RescheduleRequest {
  manageToken: string;
  dateKey: DateKey;
  startTime: TimeKey;
}
