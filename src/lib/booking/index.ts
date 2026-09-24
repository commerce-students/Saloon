import { isSupabaseConfigured } from '@/lib/supabase/config';

import { createDemoBackend } from './demo-backend';
import { createSupabaseBackend } from './supabase-backend';
import type { BookingBackend, BookingBackendKind } from './backend';

/**
 * Picks the booking backend at runtime.
 *
 * `demo`      → mock catalogue + in-browser appointments (default, no setup).
 * `supabase`  → live data once the Supabase environment variables are set.
 */
export function bookingBackendKind(): BookingBackendKind {
  return isSupabaseConfigured() ? 'supabase' : 'demo';
}

let backend: BookingBackend | null = null;

export function getBookingBackend(): BookingBackend {
  if (backend) return backend;
  backend = isSupabaseConfigured() ? createSupabaseBackend() : createDemoBackend();
  return backend;
}

export * from './backend';
export * from './availability';
export * from './date';
export * from './ids';
export * from './types';
export * from './validation';
