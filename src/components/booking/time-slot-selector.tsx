'use client';

import { CalendarDays, Clock, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/ui/icon-button';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { formatDateLong, formatDuration, formatTime } from '@/lib/booking/date';
import type { DateKey } from '@/lib/booking/date';
import type { DayAvailability, Slot, SlotUnavailableReason } from '@/lib/booking/types';

function reasonLabel(reason: SlotUnavailableReason | undefined): string | null {
  switch (reason) {
    case 'booked':
      return 'Already booked';
    case 'past':
      return 'Too late to book';
    case 'blocked':
      return 'Clinic unavailable';
    case 'closed':
      return 'Clinic closed';
    default:
      return null;
  }
}

/**
 * Step 3 — choose a time.
 *
 * Unavailable slots stay visible but disabled, so customers immediately see
 * that 11:00 exists but is taken — much clearer than a slot that silently
 * disappears. Groups sessions into morning and evening, which matches how a
 * Muscat clinic day is actually organised.
 */
export function TimeSlotSelector({
  dateKey,
  availability,
  loading,
  selectedStart,
  onSelect,
  errorMessage,
  serviceDurationMinutes,
  onChangeDate,
}: {
  dateKey: DateKey | null;
  availability: DayAvailability | null;
  loading: boolean;
  selectedStart: string | null;
  onSelect: (slot: Slot) => void;
  errorMessage?: string | null;
  serviceDurationMinutes: number;
  onChangeDate: () => void;
}) {
  if (!dateKey) {
    return (
      <Alert tone="info" title="Choose a date first">
        Pick a date in the previous step and the available times will appear here.
      </Alert>
    );
  }

  const available = (availability?.slots ?? []).filter((slot) => slot.available);
  const unavailable = (availability?.slots ?? []).filter((slot) => !slot.available);

  return (
    <div>
      <div className="border-line bg-cream/40 flex flex-wrap items-center justify-between gap-3 border px-4 py-3">
        <p className="text-ink flex items-center gap-2.5 text-[0.9375rem]">
          <CalendarDays className="text-accent-soft size-4" aria-hidden="true" />
          <span className="font-medium">{formatDateLong(dateKey)}</span>
        </p>
        <IconButton icon="edit" label="Change date" onClick={onChangeDate}>
          Change date
        </IconButton>
      </div>

      {errorMessage ? (
        <Alert tone="error" className="mt-4" title="That time is no longer available" live>
          {errorMessage}
        </Alert>
      ) : null}

      {loading || !availability ? (
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-busy="true">
          <span className="sr-only">Loading available times</span>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-12" />
          ))}
        </div>
      ) : availability.slots.length === 0 ? (
        <Alert tone="warning" className="mt-5" title="The clinic is closed on this date">
          Please choose another day. Weekend opening hours can differ — the calendar only offers
          days the clinic is open.
        </Alert>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <h3 className="text-ink font-serif text-[1.125rem]">Available times</h3>
            <Badge tone={available.length > 0 ? 'accent' : 'neutral'}>
              {available.length} {available.length === 1 ? 'slot' : 'slots'}
            </Badge>
          </div>

          {available.length === 0 ? (
            <Alert tone="warning" className="mt-4" title="Fully booked">
              Every appointment on this date is already reserved. Please go back and choose another
              day — the calendar shows the next availability.
            </Alert>
          ) : (
            <div
              role="radiogroup"
              aria-label="Available appointment times"
              className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
            >
              {available.map((slot) => {
                const selected = slot.startTime === selectedStart;
                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onSelect(slot)}
                    className={`flex h-12 items-center justify-center gap-2 border font-sans text-[0.9375rem] transition-all duration-200 ease-[var(--ease-quiet)] ${
                      selected
                        ? 'border-ink bg-ink text-ivory'
                        : 'border-line-strong bg-ivory text-ink hover:border-ink hover:bg-cream'
                    }`}
                  >
                    <Clock className="size-3.5 opacity-60" aria-hidden="true" />
                    {formatTime(slot.startTime)}
                  </button>
                );
              })}
            </div>
          )}

          {unavailable.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-ink font-serif text-[1.125rem]">Not available</h3>
              <p className="text-ink-muted mt-1 text-[0.8125rem]">
                Shown so you can see the full day. These times cannot be booked.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {unavailable.map((slot) => (
                  <li key={slot.startTime}>
                    <span
                      className="border-line bg-cream/40 text-ink-muted/70 flex h-12 cursor-not-allowed items-center justify-center gap-2 border font-sans text-[0.9375rem] line-through decoration-1"
                      aria-label={`${formatTime(slot.startTime)} — ${
                        reasonLabel(slot.reason) ?? 'not available'
                      }`}
                    >
                      {formatTime(slot.startTime)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-ink-muted mt-6 flex items-start gap-2 text-[0.8125rem] leading-relaxed">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Your appointment lasts {formatDuration(serviceDurationMinutes)}. The diary reserves
              the full time for you — please arrive a few minutes early.
            </span>
          </p>
        </>
      )}
    </div>
  );
}

/** Small inline spinner reused by parent steps. */
export function SlotLoadingIndicator() {
  return <Spinner className="size-4" />;
}
