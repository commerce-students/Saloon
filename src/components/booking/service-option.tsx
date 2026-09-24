'use client';

import { Clock, Info, Wallet } from 'lucide-react';

import { formatCurrency } from '@/lib/format';
import type { Service } from '@/lib/booking/types';

import { formatDuration } from '@/lib/booking/date';

/**
 * Selectable service row used inside the wizard — a radio input styled as a
 * card, so keyboard and screen-reader behaviour comes for free.
 */
export function ServiceOption({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`group relative flex cursor-pointer items-start gap-4 border p-5 transition-all duration-200 ease-[var(--ease-quiet)] ${
        selected
          ? 'border-ink bg-cream/50 shadow-[var(--shadow-soft)]'
          : 'border-line bg-ivory hover:border-ink-muted hover:bg-cream/30'
      }`}
    >
      <input
        type="radio"
        name="service"
        value={service.id}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />

      <span
        aria-hidden="true"
        className={`mt-1 grid size-4 shrink-0 place-items-center rounded-full border transition-colors ${
          selected ? 'border-ink' : 'border-line-strong group-hover:border-ink-muted'
        }`}
      >
        <span
          className={`size-2 rounded-full transition-transform duration-200 ${
            selected ? 'bg-ink scale-100' : 'scale-0 bg-transparent'
          }`}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-ink font-serif text-[1.1875rem] leading-snug">{service.name}</span>
          <span className="text-ink-muted flex items-center gap-3 font-sans text-[0.8125rem]">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              {formatDuration(service.durationMinutes)}
            </span>
            {service.price !== null ? (
              <span className="flex items-center gap-1.5">
                <Wallet className="size-3.5" aria-hidden="true" />
                {formatCurrency(service.price, service.currency)}
              </span>
            ) : (
              <span className="text-ink-muted">Price on consultation</span>
            )}
          </span>
        </span>

        <span className="text-ink-soft mt-2 block text-[0.9375rem] leading-relaxed">
          {service.description}
        </span>

        {service.isPlaceholder ? (
          <span className="text-ink-muted mt-3 inline-flex items-center gap-1.5 font-sans text-[0.6875rem] tracking-[0.08em] uppercase">
            <Info className="size-3" aria-hidden="true" />
            Demo entry — replace with real treatment details
          </span>
        ) : null}
      </span>
    </label>
  );
}
