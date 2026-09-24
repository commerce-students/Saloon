import { ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

import { formatCurrency } from '@/lib/format';
import { formatDuration } from '@/lib/booking/date';
import type { Service } from '@/lib/booking/types';

/**
 * Service card. The whole card is a link into the booking flow with the service
 * pre-selected, so "Book" is one tap on mobile and the card is keyboard
 * reachable as a single control (with a proper focus ring).
 */
export function ServiceCard({ service, index = 0 }: { service: Service; index?: number }) {
  const bookHref = `/book?service=${encodeURIComponent(service.id)}`;

  return (
    <li
      className="animate-rise-in group h-full"
      style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}
    >
      <Link
        href={bookHref}
        className="border-line bg-ivory hover:border-line-strong flex h-full flex-col border p-6 transition-all duration-300 ease-[var(--ease-quiet)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
        aria-label={`Book ${service.name} — ${formatDuration(service.durationMinutes)}`}
      >
        {service.category ? <span className="text-eyebrow">{service.category}</span> : null}

        <h3 className="text-ink mt-4 font-serif text-[1.375rem] leading-snug">{service.name}</h3>

        <p className="text-ink-soft mt-3 flex-1 text-[0.9375rem] leading-relaxed">
          {service.description}
        </p>

        <div className="border-line mt-6 flex items-center justify-between gap-4 border-t pt-5">
          <span className="text-ink-muted flex items-center gap-2 font-sans text-[0.8125rem]">
            <Clock className="text-accent-soft size-3.5" aria-hidden="true" />
            {formatDuration(service.durationMinutes)}
            <span aria-hidden="true">·</span>
            {service.price !== null ? (
              <span>{formatCurrency(service.price, service.currency)}</span>
            ) : (
              <span>Price on consultation</span>
            )}
          </span>

          <span className="text-ink inline-flex items-center gap-1.5 font-sans text-[0.75rem] tracking-[0.1em] uppercase">
            Book
            <ArrowRight
              className="size-3.5 transition-transform duration-300 ease-[var(--ease-quiet)] group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </Link>
    </li>
  );
}
