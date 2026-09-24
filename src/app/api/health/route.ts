import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isWhatsAppConfigured } from '@/lib/whatsapp/client';

/**
 * Deployment health check.
 *
 * Reports which integrations are configured — never their values. Useful for
 * uptime monitoring and for confirming, after a deploy, that Supabase and
 * WhatsApp were picked up from the environment.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'chic-by-sisters-clinic-booking',
      integrations: {
        bookingBackend: isSupabaseConfigured() ? 'supabase' : 'demo',
        supabase: isSupabaseConfigured() ? 'configured' : 'not_configured',
        whatsapp: isWhatsAppConfigured() ? 'configured' : 'not_configured',
      },
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
