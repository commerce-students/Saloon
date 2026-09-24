'use client';

import { CalendarHeart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { whatsappHref } from '@/config/clinic';
import { useScrolled } from '@/hooks/use-scrolled';

/**
 * Thumb-reachable booking CTA for small screens. Appears after the hero and is
 * hidden inside the booking flow itself and in the private areas.
 */
export function MobileBookingBar() {
  const pathname = usePathname();
  const visible = useScrolled(420);

  const hiddenRoute =
    pathname?.startsWith('/book') ||
    pathname?.startsWith('/manage') ||
    pathname?.startsWith('/admin');

  if (hiddenRoute) return null;

  const whatsapp = whatsappHref(
    'Hello Chic by Sisters Clinic, I would like help booking an appointment.',
  );

  return (
    <div
      className={`border-line bg-ivory/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 backdrop-blur-md transition-transform duration-300 ease-[var(--ease-quiet)] lg:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3">
        <Link
          href="/book"
          className="bg-ink text-ivory flex h-12 flex-1 items-center justify-center gap-2 rounded-[2px] font-sans text-[0.9375rem] font-medium tracking-[0.02em] transition-colors active:bg-[#332e2b]"
        >
          <CalendarHeart className="size-4" aria-hidden="true" />
          Book an appointment
        </Link>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with the clinic on WhatsApp"
            className="border-line-strong text-ink active:bg-cream grid size-12 shrink-0 place-items-center rounded-[2px] border transition-colors"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <p className="sr-only">Booking, availability and confirmation — no phone call required.</p>
    </div>
  );
}
