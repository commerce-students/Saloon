'use client';

import { Check } from 'lucide-react';

import { BOOKING_STEPS } from '@/hooks/use-booking-flow';
import type { BookingStep } from '@/hooks/use-booking-flow';

/**
 * Progress indicator: Service → Date → Time → Details → Confirm.
 *
 * Rendered as an ordered list so assistive technology announces position
 * ("step 2 of 5"). Completed steps are clickable so customers can go back and
 * change any detail without losing their progress.
 */
export function BookingProgress({
  current,
  onNavigate,
  maxReachedIndex,
}: {
  current: BookingStep;
  onNavigate?: (step: BookingStep) => void;
  /** Furthest step the customer has reached — later steps stay disabled. */
  maxReachedIndex: number;
}) {
  const currentIndex = BOOKING_STEPS.findIndex((entry) => entry.id === current);

  return (
    <nav
      aria-label="Booking progress"
      className="border-line bg-ivory/80 border-b px-5 py-4 sm:px-7"
    >
      <ol className="flex items-center">
        {BOOKING_STEPS.map((entry, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;
          const reachable = index <= maxReachedIndex && Boolean(onNavigate);

          return (
            <li key={entry.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex min-w-0 flex-col items-center gap-2 sm:flex-row sm:gap-3">
                <span
                  aria-hidden="true"
                  className={`grid size-7 shrink-0 place-items-center rounded-full border text-[0.6875rem] font-medium transition-colors duration-300 ${
                    complete
                      ? 'border-accent bg-accent text-ivory'
                      : active
                        ? 'border-ink bg-ink text-ivory'
                        : 'border-line-strong bg-ivory text-ink-muted'
                  }`}
                >
                  {complete ? <Check className="size-3.5" /> : index + 1}
                </span>

                {/* On small screens the label is visually hidden, so a screen-reader
                    only version carries the step name; on larger screens the visible
                    element is the accessible name (added once, never twice). */}
                {reachable ? (
                  <button
                    type="button"
                    onClick={() => onNavigate?.(entry.id)}
                    aria-label={`${entry.label}${active ? ' — current step' : complete ? ' — completed' : ''}`}
                    className={`hidden truncate font-sans text-[0.75rem] tracking-[0.1em] uppercase transition-colors sm:block ${
                      active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <span aria-hidden="true">{entry.label}</span>
                  </button>
                ) : (
                  <span
                    aria-hidden="true"
                    className={`hidden truncate font-sans text-[0.75rem] tracking-[0.1em] uppercase sm:block ${
                      active ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    {entry.label}
                  </span>
                )}

                <span className="sr-only sm:hidden">
                  {entry.label}
                  {active ? ' — current step' : complete ? ' — completed' : ''}
                </span>
              </div>

              {index < BOOKING_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`mx-2 h-px flex-1 transition-colors duration-300 sm:mx-4 ${
                    complete ? 'bg-accent-soft' : 'bg-line'
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
