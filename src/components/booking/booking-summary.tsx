'use client';

import { CalendarDays, Clock, MapPin, Sparkles, User } from 'lucide-react';
import type { ReactNode } from 'react';

import { clinicLocationLine } from '@/config/clinic';
import { formatDateLong, formatDateMedium, formatDuration, formatTime } from '@/lib/booking/date';
import type { DateKey } from '@/lib/booking/date';

function Row({
  icon,
  label,
  children,
  onEdit,
  editLabel,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="border-line flex items-start gap-3 border-b py-3.5 last:border-b-0">
      <span className="text-accent-soft mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-eyebrow mb-1">{label}</dt>
        <dd className="text-ink text-[0.9375rem] leading-relaxed">{children}</dd>
      </div>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="text-ink-muted hover:border-accent hover:text-accent shrink-0 border-b border-transparent font-sans text-[0.75rem] tracking-[0.08em] uppercase transition-colors"
        >
          {editLabel ?? 'Change'}
        </button>
      ) : null}
    </div>
  );
}

export interface BookingSummaryProps {
  serviceName: string | null;
  serviceDurationMinutes: number | null;
  price?: number | null;
  formatPrice?: (value: number) => string;
  dateKey: DateKey | null;
  time: string | null;
  customerName: string | null;
  customerPhone?: string | null;
  location?: string;
  onEditService?: () => void;
  onEditDate?: () => void;
  onEditTime?: () => void;
  onEditDetails?: () => void;
  compact?: boolean;
}

/**
 * Live appointment summary — the same component powers the sidebar during
 * booking, the confirmation step and the reschedule review, so the wording can
 * never drift between screens.
 */
export function BookingSummary({
  serviceName,
  serviceDurationMinutes,
  price,
  formatPrice,
  dateKey,
  time,
  customerName,
  customerPhone,
  location,
  onEditService,
  onEditDate,
  onEditTime,
  onEditDetails,
  compact = false,
}: BookingSummaryProps) {
  return (
    <dl className={compact ? '' : 'mt-1'}>
      <Row
        icon={<Sparkles className="size-4" aria-hidden="true" />}
        label="Service"
        onEdit={onEditService}
      >
        {serviceName ?? <span className="text-ink-muted">Not selected yet</span>}
        {serviceName && serviceDurationMinutes ? (
          <span className="text-ink-muted mt-0.5 block text-[0.8125rem]">
            {formatDuration(serviceDurationMinutes)}
            {price !== null && price !== undefined && formatPrice ? ` · ${formatPrice(price)}` : ''}
          </span>
        ) : null}
      </Row>

      <Row
        icon={<CalendarDays className="size-4" aria-hidden="true" />}
        label="Date"
        onEdit={onEditDate}
      >
        {dateKey ? (
          formatDateLong(dateKey)
        ) : (
          <span className="text-ink-muted">Not selected yet</span>
        )}
      </Row>

      <Row icon={<Clock className="size-4" aria-hidden="true" />} label="Time" onEdit={onEditTime}>
        {time ? (
          <span className="inline-flex flex-wrap items-baseline gap-2">
            <span className="font-medium">{formatTime(time)}</span>
            {serviceDurationMinutes ? (
              <span className="text-ink-muted text-[0.8125rem]">
                for {formatDuration(serviceDurationMinutes)}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-ink-muted">Not selected yet</span>
        )}
      </Row>

      <Row
        icon={<User className="size-4" aria-hidden="true" />}
        label="Customer"
        onEdit={onEditDetails}
      >
        {customerName ? (
          <>
            {customerName}
            {customerPhone ? (
              <span className="text-ink-muted mt-0.5 block text-[0.8125rem]" dir="ltr">
                {customerPhone}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-ink-muted">Not entered yet</span>
        )}
      </Row>

      <Row icon={<MapPin className="size-4" aria-hidden="true" />} label="Location">
        {location ?? clinicLocationLine}
      </Row>
    </dl>
  );
}

/** Compact line used on small screens above the step content. */
export function BookingSummaryStrip({
  serviceName,
  serviceDurationMinutes,
  dateKey,
  time,
}: {
  serviceName: string | null;
  serviceDurationMinutes: number | null;
  dateKey: DateKey | null;
  time: string | null;
}) {
  const parts = [
    serviceName,
    serviceDurationMinutes ? formatDuration(serviceDurationMinutes) : null,
    dateKey ? formatDateMedium(dateKey) : null,
    time ? formatTime(time) : null,
  ].filter(Boolean) as string[];

  if (parts.length === 0) return null;

  return (
    <p className="border-line bg-cream/40 text-ink-soft border-b px-5 py-2.5 text-[0.8125rem] sm:px-7 lg:hidden">
      {parts.join(' · ')}
    </p>
  );
}
