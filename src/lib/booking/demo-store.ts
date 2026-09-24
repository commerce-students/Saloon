/**
 * Browser storage for the demo backend.
 *
 * Appointments created in the demo live in the visitor's own browser so the
 * whole journey (book → confirm → manage → reschedule → cancel) works without
 * a server. A real deployment replaces this with Supabase — see
 * `src/lib/booking/supabase/backend.ts`.
 */

import type { Appointment } from './types';

export const DEMO_STORAGE_KEY = 'chic-by-sisters:demo-appointments:v1';
export const DEMO_STORAGE_EVENT = 'chic-by-sisters:appointments-changed';

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function isAppointment(value: unknown): value is Appointment {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Appointment>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.manageToken === 'string' &&
    typeof candidate.dateKey === 'string' &&
    typeof candidate.startTime === 'string' &&
    typeof candidate.serviceId === 'string' &&
    typeof candidate.customer === 'object' &&
    candidate.customer !== null
  );
}

export function readStoredAppointments(): Appointment[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAppointment);
  } catch {
    // Corrupted or unavailable storage should never break the booking flow.
    return [];
  }
}

export function writeStoredAppointments(appointments: Appointment[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(appointments));
    window.dispatchEvent(new CustomEvent(DEMO_STORAGE_EVENT));
  } catch {
    // Quota or private-mode failures are non-fatal for the demo.
  }
}

export function upsertStoredAppointment(appointment: Appointment): void {
  const appointments = readStoredAppointments();
  const index = appointments.findIndex((entry) => entry.id === appointment.id);
  if (index >= 0) {
    appointments[index] = appointment;
  } else {
    appointments.push(appointment);
  }
  writeStoredAppointments(appointments);
}

export function findStoredByToken(token: string): Appointment | undefined {
  return readStoredAppointments().find((appointment) => appointment.manageToken === token);
}

export function findStoredByReference(referenceCode: string): Appointment | undefined {
  return readStoredAppointments().find(
    (appointment) => appointment.referenceCode.toUpperCase() === referenceCode.toUpperCase(),
  );
}
