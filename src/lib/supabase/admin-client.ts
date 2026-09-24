import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminCredentials } from './config';

/**
 * Supabase client with the service-role key.
 *
 * ⚠️  Bypasses Row Level Security. Only ever import this on the server — the
 * `server-only` guard turns any accidental Client Component import into a build
 * error, so the key can never reach the browser bundle.
 *
 * Intended uses: WhatsApp notification queues, scheduled reminders, maintenance
 * jobs, and server-side admin actions that must re-check authorisation.
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const credentials = getSupabaseAdminCredentials();
  if (!credentials) return null;

  return createClient(credentials.url, credentials.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'chic-by-sisters-clinic-booking' } },
  });
}
