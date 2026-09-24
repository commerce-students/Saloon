/**
 * Supabase configuration.
 *
 * The app runs in demo mode until `NEXT_PUBLIC_SUPABASE_URL` and
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present — nothing is claimed to be
 * connected before that. The service-role key is read on the server only and is
 * never exposed to the browser.
 */

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

function read(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = read(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = read(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

/**
 * Server-only service-role client, for trusted jobs (WhatsApp automation,
 * scheduled reminders). Importing this from a Client Component would leak the
 * key — the `server-only` guard in `src/lib/supabase/admin.ts` enforces that.
 */
export function getSupabaseAdminCredentials(): { url: string; serviceRoleKey: string } | null {
  const config = getSupabasePublicConfig();
  const serviceRoleKey = read(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!config || !serviceRoleKey) return null;
  return { url: config.url, serviceRoleKey };
}
