'use client';

import { CalendarDays, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateMedium, formatTime } from '@/lib/booking/date';
import { readRecentAppointments, type RecentAppointment } from '@/lib/booking/recent-appointments';

/**
 * Appointments booked from this browser.
 *
 * The management token is the credential, so it is stored locally and used here
 * to build links — never published in a list or sent anywhere. A production
 * deployment also delivers the same link by SMS/WhatsApp/email, which is what
 * makes it work across devices.
 */
export function RecentAppointments() {
  const [items, setItems] = useState<RecentAppointment[] | null>(null);

  useEffect(() => {
    setItems(readRecentAppointments());
  }, []);

  if (items === null) {
    return <div className="skeleton border-line h-32 border" aria-hidden="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="border-line bg-cream/30 text-ink-soft border px-5 py-6 text-[0.9375rem] leading-relaxed">
        <p className="text-ink font-medium">No appointments saved on this device</p>
        <p className="mt-2">
          When you book, the appointment is remembered here so you can reschedule or cancel it later
          without hunting through your messages. If you booked from another phone or computer, use
          the manage link you received, or look it up below.
        </p>
        <Link
          href="/book"
          className="border-ink hover:border-accent hover:text-accent mt-4 inline-flex items-center gap-1.5 border-b pb-0.5 font-sans text-[0.8125rem] tracking-[0.08em] uppercase transition-colors"
        >
          Book an appointment
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-line border-line bg-ivory flex flex-col divide-y border">
      {items.map((item) => (
        <li key={item.manageToken}>
          <Link
            href={`/manage/${item.manageToken}`}
            className="hover:bg-cream/40 flex items-center gap-4 px-5 py-4 transition-colors"
          >
            <span className="border-line text-accent grid size-10 shrink-0 place-items-center border">
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="text-ink block truncate font-sans text-[0.9375rem]">
                {item.serviceName}
              </span>
              <span className="text-ink-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[0.8125rem]">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {formatDateMedium(item.dateKey)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {formatTime(item.startTime)}
                </span>
                <span dir="ltr" className="tracking-[0.06em]">
                  {item.referenceCode}
                </span>
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-3">
              <StatusBadge status={item.status} />
              <ChevronRight className="text-ink-muted size-4" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
