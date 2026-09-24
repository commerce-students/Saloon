import 'server-only';

import { DEMO_SERVICES } from '@/data/services';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

import { mapService, SERVICE_SELECT_COLUMNS, type ServiceRow } from './supabase-mappers';
import type { Service } from './types';

/**
 * Services for server-rendered pages (home, /services).
 *
 * When Supabase is configured the list comes from the database; otherwise the
 * clearly-labelled demo catalogue is used, so the marketing pages are always
 * fully rendered and indexable — never empty because a backend is missing.
 */
export async function listActiveServices(): Promise<Service[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase!
        .from('services')
        .select(SERVICE_SELECT_COLUMNS)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return (data as ServiceRow[]).map(mapService);
      }
    } catch {
      // Fall through to the demo catalogue rather than showing an empty page.
    }
  }

  return DEMO_SERVICES.filter((service) => service.active);
}
