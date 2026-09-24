'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button, ButtonLink } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { bookingConfig } from '@/config/booking';
import { getBookingBackend } from '@/lib/booking';
import {
  WEEKDAY_SHORT_LABELS,
  addDays,
  dateKeyToUtc,
  formatDateLong,
  formatMonthLabel,
  todayKey,
} from '@/lib/booking/date';
import type { DateKey } from '@/lib/booking/date';
import type { MonthDay } from '@/lib/booking/availability';
import { useMonthAvailability } from '@/hooks/use-month-availability';

/**
 * Step 2 — pick a date.
 *
 * A real month grid where unavailable days are visible but not selectable, so
 * the customer can see the shape of the week instead of staring at an empty
 * calendar. Every day cell is a proper button with an accessible description.
 */
export function DatePicker({
  serviceId,
  value,
  onSelect,
}: {
  serviceId: string;
  value: DateKey | null;
  onSelect: (dateKey: DateKey) => void;
}) {
  const today = todayKey();
  const lastBookable = addDays(today, bookingConfig.horizonDays);

  const initial = value ?? today;
  const [cursor, setCursor] = useState({
    year: dateKeyToUtc(initial).getUTCFullYear(),
    month: dateKeyToUtc(initial).getUTCMonth(),
  });
  const [nextAvailable, setNextAvailable] = useState<DateKey | null>(null);
  const [checkingNext, setCheckingNext] = useState(true);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const hasJumpedRef = useRef(false);
  const selectedRef = useRef(value);

  const { days, loading, error } = useMonthAvailability(serviceId, cursor.year, cursor.month);

  // Jump to the soonest bookable day once, when the step first opens.
  useEffect(() => {
    let active = true;
    setCheckingNext(true);

    getBookingBackend()
      .findNextAvailableDate(serviceId)
      .then((result) => {
        if (!active) return;
        setNextAvailable(result);

        if (result && !selectedRef.current && !hasJumpedRef.current) {
          hasJumpedRef.current = true;
          const date = dateKeyToUtc(result);
          setCursor({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
        }
      })
      .catch(() => {
        if (active) setNextAvailable(null);
      })
      .finally(() => {
        if (active) setCheckingNext(false);
      });

    return () => {
      active = false;
    };
  }, [serviceId]);

  const daysByKey = useMemo(() => {
    const map = new Map<DateKey, MonthDay>();
    for (const day of days ?? []) map.set(day.dateKey, day);
    return map;
  }, [days]);

  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const currentMonthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const thisMonthKey = today.slice(0, 7);
  const lastMonthKey = lastBookable.slice(0, 7);

  const canGoBack = currentMonthKey > thisMonthKey;
  const canGoForward = currentMonthKey < lastMonthKey;

  const shiftMonth = (delta: number) => {
    setCursor((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  };

  const monthHasAvailability = useMemo(() => (days ?? []).some((day) => day.isSelectable), [days]);

  const goToNextAvailable = () => {
    if (!nextAvailable) return;
    const date = dateKeyToUtc(nextAvailable);
    setCursor({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
    firstFocusableRef.current?.focus();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="border-line text-ink hover:bg-cream grid size-11 place-items-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        <p aria-live="polite" className="text-ink font-serif text-[1.25rem]">
          {formatMonthLabel(cursor.year, cursor.month)}
        </p>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={!canGoForward}
          aria-label="Next month"
          className="border-line text-ink hover:bg-cream grid size-11 place-items-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-1 h-5 text-center" aria-live="polite">
        {loading || checkingNext ? (
          <span className="text-ink-muted inline-flex items-center gap-2 text-[0.75rem]">
            <Spinner className="size-3.5" /> Checking availability…
          </span>
        ) : null}
      </div>

      <table className="w-full border-separate border-spacing-1">
        <caption className="sr-only">
          Choose an appointment date. Available dates are shown as buttons.
        </caption>
        <thead>
          <tr>
            {WEEKDAY_SHORT_LABELS.map((label) => (
              <th
                key={label}
                scope="col"
                className="text-ink-muted pb-2 font-sans text-[0.6875rem] font-medium tracking-[0.12em] uppercase"
              >
                <span aria-hidden="true">{label.slice(0, 1)}</span>
                <span className="sr-only">{label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, weekIndex) => (
            <tr key={weekIndex}>
              {cells.slice(weekIndex * 7, weekIndex * 7 + 7).map((dayNumber, index) => {
                if (dayNumber === null) {
                  return <td key={`empty-${weekIndex}-${index}`} aria-hidden="true" />;
                }

                const dateKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(
                  dayNumber,
                ).padStart(2, '0')}`;
                const info = daysByKey.get(dateKey);
                const isPast = dateKey < today;
                const beyond = dateKey > lastBookable;
                const selectable = info?.isSelectable === true && !isPast && !beyond;
                const selected = value === dateKey;

                const description = isPast
                  ? 'in the past'
                  : beyond
                    ? 'outside the booking window'
                    : !info
                      ? 'loading availability'
                      : info.availableCount === 0
                        ? info.isOpen
                          ? 'fully booked'
                          : 'clinic closed'
                        : `${info.availableCount} ${
                            info.availableCount === 1 ? 'time' : 'times'
                          } available`;

                return (
                  <td key={dateKey}>
                    <button
                      type="button"
                      ref={dateKey === (nextAvailable ?? '') ? firstFocusableRef : undefined}
                      disabled={!selectable}
                      aria-pressed={selected}
                      aria-label={`${formatDateLong(dateKey)} — ${description}`}
                      onClick={() => onSelect(dateKey)}
                      className={`relative h-11 w-full border font-sans text-[0.875rem] transition-all duration-200 ease-[var(--ease-quiet)] sm:h-12 ${
                        selected
                          ? 'border-ink bg-ink text-ivory font-medium'
                          : selectable
                            ? 'border-line bg-ivory text-ink hover:border-ink hover:bg-cream'
                            : 'bg-cream/40 text-ink-muted/45 cursor-not-allowed border-transparent line-through decoration-1'
                      }`}
                    >
                      {dayNumber}
                      {selectable && !selected ? (
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full ${
                            (info?.availableCount ?? 0) > 3 ? 'bg-accent-soft' : 'bg-nude'
                          }`}
                        />
                      ) : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-ink-muted mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.75rem]">
        <span className="inline-flex items-center gap-2">
          <span className="border-line bg-ivory size-3 border" aria-hidden="true" />
          Available
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="bg-cream/60 size-3 border border-transparent" aria-hidden="true" />
          Closed or fully booked
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="border-ink bg-ink size-3 border" aria-hidden="true" />
          Selected
        </span>
      </div>

      {error ? (
        <Alert tone="warning" className="mt-5">
          {error}
        </Alert>
      ) : null}

      {!loading && !checkingNext && !error && days && !monthHasAvailability ? (
        <Alert tone="info" className="mt-5" title="No availability this month">
          <p>
            Every bookable day this month is either closed or fully reserved.
            {nextAvailable ? ` The next available date is ${formatDateLong(nextAvailable)}.` : ''}
          </p>
          {nextAvailable ? (
            <div className="mt-3">
              <Button type="button" variant="outline" size="sm" onClick={goToNextAvailable}>
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Show next available
              </Button>
            </div>
          ) : (
            <p className="mt-2">
              Please contact the clinic — the appointment book is full for the next{' '}
              {bookingConfig.horizonDays} days.
            </p>
          )}
        </Alert>
      ) : null}

      {!loading && !checkingNext && nextAvailable === null && !error ? (
        <Alert tone="warning" className="mt-5" title="No appointments available">
          The diary is full for the next {bookingConfig.horizonDays} days. Please{' '}
          <ButtonLink href="/location" variant="link" className="underline">
            contact the clinic
          </ButtonLink>{' '}
          and we will find a time for you.
        </Alert>
      ) : null}
    </div>
  );
}
