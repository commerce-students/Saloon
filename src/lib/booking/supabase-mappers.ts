/**
 * Postgres rows → app types.
 *
 * Kept separate from the Supabase client code so the same mapping is used by
 * the browser backend and by server components that render services for SEO.
 */

import { isDateKey, isTimeKey, todayKey } from './date';
import type { DateKey, TimeKey } from './date';
import type { Appointment, AppointmentStatus, Service, Slot, SlotUnavailableReason } from './types';

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string | null;
  category: string | null;
  active: boolean;
}

export interface SlotRow {
  start_time: string;
  end_time: string;
  available: boolean;
  reason: string | null;
}

export interface AppointmentRow {
  id: string;
  reference_code: string;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  staff_id: string | null;
  staff_name: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_id: string | null;
  manage_token?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/** Postgres `time` arrives as `HH:MM:SS`; the app works with `HH:MM`. */
export function toTimeKey(value: unknown): TimeKey {
  const raw = typeof value === 'string' ? value : '';
  const short = raw.slice(0, 5);
  return isTimeKey(short) ? short : '00:00';
}

export function toDateKey(value: unknown): DateKey {
  const raw = typeof value === 'string' ? value.slice(0, 10) : '';
  return isDateKey(raw) ? raw : todayKey();
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStatus(value: unknown): AppointmentStatus {
  const allowed: AppointmentStatus[] = [
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no-show',
    'rescheduled',
  ];
  return allowed.includes(value as AppointmentStatus) ? (value as AppointmentStatus) : 'pending';
}

export function mapService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    durationMinutes: toNumber(row.duration_minutes, 30),
    price: row.price === null || row.price === undefined ? null : toNumber(row.price),
    currency: row.currency ?? 'OMR',
    category: row.category ?? undefined,
    active: row.active !== false,
    isPlaceholder: false,
  };
}

export function mapSlot(row: SlotRow): Slot {
  return {
    startTime: toTimeKey(row.start_time),
    endTime: toTimeKey(row.end_time),
    available: row.available === true,
    reason: (row.reason ?? undefined) as SlotUnavailableReason | undefined,
  };
}

export function mapAppointment(row: AppointmentRow, manageToken?: string): Appointment {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    serviceId: row.service_id,
    serviceName: row.service_name,
    serviceDurationMinutes: toNumber(row.duration_minutes, 30),
    staffId: toNullableString(row.staff_id),
    staffName: toNullableString(row.staff_name),
    dateKey: toDateKey(row.appointment_date),
    startTime: toTimeKey(row.start_time),
    endTime: toTimeKey(row.end_time),
    status: toStatus(row.status),
    notes: toNullableString(row.notes),
    customer: {
      id: row.customer_id ?? '',
      name: row.customer_name,
      phone: row.customer_phone,
      email: toNullableString(row.customer_email),
    },
    manageToken: manageToken ?? row.manage_token ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

export const SERVICE_SELECT_COLUMNS =
  'id,name,description,duration_minutes,price,currency,category,active';
