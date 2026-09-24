/**
 * "Your appointments on this device".
 *
 * The management token is the credential that unlocks an appointment, so it is
 * kept locally (never in a public URL or a shared list) and the /manage hub can
 * show the appointments booked from this browser. Real deployments also send
 * the same link by SMS/WhatsApp and email.
 */

import type { AppointmentStatus } from './types';

const STORAGE_KEY = 'chic-by-sisters:recent-appointments:v1';

export interface RecentAppointment {
  manageToken: string;
  referenceCode: string;
  serviceName: string;
  dateKey: string;
  startTime: string;
  status: AppointmentStatus;
  savedAt: string;
}

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readRecentAppointments(): RecentAppointment[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RecentAppointment[]).filter(
      (entry) => typeof entry?.manageToken === 'string' && entry.manageToken.length >= 16,
    );
  } catch {
    return [];
  }
}

export function saveRecentAppointment(entry: RecentAppointment): void {
  if (!hasStorage()) return;
  const others = readRecentAppointments().filter((item) => item.manageToken !== entry.manageToken);
  const next = [entry, ...others].slice(0, 12);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal: the confirmation screen still shows the reference code.
  }
}

export function updateRecentAppointmentStatus(
  manageToken: string,
  status: AppointmentStatus,
): void {
  if (!hasStorage()) return;
  const next = readRecentAppointments().map((entry) =>
    entry.manageToken === manageToken ? { ...entry, status } : entry,
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function forgetRecentAppointment(manageToken: string): void {
  if (!hasStorage()) return;
  const next = readRecentAppointments().filter((entry) => entry.manageToken !== manageToken);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
