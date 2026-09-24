import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabaseAdminCredentials, getSupabasePublicConfig } from './config';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase clients — the foundation for the future `/admin` area.
 *
 * Authentication is enforced on the server (cookie-based sessions with
 * `@supabase/ssr`), never in client-side code. When the admin dashboard is
 * added, every `/admin` page and route handler starts with `requireAdminUser()`
 * and the database policies in `supabase/schema.sql` do the rest.
 */

/** Request-scoped client that carries the signed-in user's session. */
export async function createServerSupabaseClient(): Promise<SupabaseClient | null> {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render: safe to ignore when a
          // route handler or middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Service-role client for trusted server jobs. Bypasses RLS — use with care. */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const credentials = getSupabaseAdminCredentials();
  if (!credentials) return null;
  return createClient(credentials.url, credentials.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface AdminUser {
  id: string;
  email: string | null;
  /** Staff role from `app_metadata.role` — see `supabase/schema.sql`. */
  role: 'admin' | 'staff' | 'viewer';
}

function readRole(user: User): AdminUser['role'] {
  const role = (user.app_metadata as { role?: unknown } | null)?.role;
  if (role === 'admin' || role === 'staff' || role === 'viewer') return role;
  return 'viewer';
}

/**
 * Returns the signed-in staff member, or `null`.
 *
 * This is the guard the future admin dashboard must call before rendering any
 * data. Client-side checks and hidden URLs are explicitly not considered
 * security here.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null, role: readRole(user) };
}

export async function requireAdminUser(
  allowedRoles: AdminUser['role'][] = ['admin', 'staff'],
): Promise<AdminUser | null> {
  const user = await getAdminUser();
  if (!user) return null;
  return allowedRoles.includes(user.role) ? user : null;
}
