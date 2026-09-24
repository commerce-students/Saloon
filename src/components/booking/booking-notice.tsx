'use client';

import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

import { bookingBackendKind } from '@/lib/booking';

/**
 * Honest status line about where bookings are stored.
 *
 * In demo mode it says so plainly (appointments stay in this browser and are not
 * sent to the clinic). Once Supabase is configured the notice disappears — the
 * message is never a marketing claim.
 */
export function BookingNotice({ className = '' }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || bookingBackendKind() !== 'demo') return null;

  return (
    <p
      className={`flex items-start gap-2.5 border border-[#e6dabb] bg-[#fbf6ea] px-4 py-3 text-[0.8125rem] leading-relaxed text-[#6f5526] ${className}`}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-medium">Demo booking.</strong> Appointments are saved in this
        browser only and are not sent to the clinic. Availability, treatments and prices are sample
        data.
      </span>
    </p>
  );
}
