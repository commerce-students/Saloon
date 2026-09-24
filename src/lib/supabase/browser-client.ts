'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabasePublicConfig } from './config';

let cached: SupabaseClient | null = null;

/**
 * Supabase client for the browser — public (anon) key only.
 *
 * Row Level Security is what protects the data; this client can never read
 * another customer's appointment, see hidden columns or write without an
 * explicit policy allowing it.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  cached ??= createBrowserClient(config.url, config.anonKey);
  return cached;
}
