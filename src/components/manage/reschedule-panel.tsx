'use client';

import { CalendarCheck, Clock, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/booking/date-picker';
import { TimeSlotSelector } from '@/components/booking/time-slot-selector';
import { getBookingBackend } from '@/lib/booking';
import { formatDateLong, formatTime } from '@/lib/booking/date';
import type { DateKey } from '@/lib/booking/date';
import type { Appointment, DayAvailability, Slot } from '@/lib/booking/types';

/**
 * Reschedule flow: pick a new date, pick a new time, confirm the change.
 *
 * The backend re-validates the new slot against the live diary before writing,
 * so a slot that was taken while the customer was deciding is rejected with a
 * clear message instead of quietly double-booking.
 */
export function ReschedulePanel({
  appointment,
  onRescheduled,
  onDismiss,
}: {
  appointment: Appointment;
  onRescheduled: (appointment: Appointment) => void;
  onDismiss: () => void;
}) {
  const backend = getBookingBackend();
  const [dateKey, setDateKey] = useState<DateKey | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectDate = async (next: DateKey) => {
    setDateKey(next);
    setSlot(null);
    setError(null);
    setLoading(true);
    try {
      const result = await backend.getDayAvailability({
        serviceId: appointment.serviceId,
        dateKey: next,
        ignoreAppointmentId: appointment.id,
      });
      setAvailability(result);
    } catch {
      setAvailability({ dateKey: next, isOpen: false, availableCount: 0, slots: [] });
      setError('We could not load the available times. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!dateKey || !slot) return;
    setSaving(true);
    setError(null);

    try {
      const result = await backend.reschedule({
        manageToken: appointment.manageToken,
        dateKey,
        startTime: slot.startTime,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onRescheduled(result.appointment);
    } catch {
      setError('The change could not be saved. Please try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  const unchanged = dateKey === appointment.dateKey && slot?.startTime === appointment.startTime;

  return (
    <div className="animate-fade-in border-line bg-cream/30 border p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-[1.375rem]">Choose a new time</h2>
          <p className="text-ink-soft mt-1.5 text-[0.875rem] leading-relaxed">
            Your appointment will keep the same treatment and duration. You are changing the date
            and time only.
          </p>
        </div>
        <Button variant="link" size="sm" onClick={onDismiss} type="button">
          Close
        </Button>
      </div>

      {error ? (
        <Alert tone="error" className="mt-5" live>
          {error}
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-eyebrow mb-4">New date</h3>
          <DatePicker
            serviceId={appointment.serviceId}
            value={dateKey}
            onSelect={handleSelectDate}
          />
        </div>

        <div>
          <h3 className="text-eyebrow mb-4">New time</h3>
          {loading ? (
            <div className="grid grid-cols-2 gap-2.5" aria-busy="true">
              <span className="sr-only">Loading times</span>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="skeleton h-12" />
              ))}
            </div>
          ) : (
            <TimeSlotSelector
              dateKey={dateKey}
              availability={availability}
              loading={loading}
              selectedStart={slot?.startTime ?? null}
              onSelect={setSlot}
              serviceDurationMinutes={appointment.serviceDurationMinutes}
              onChangeDate={onDismiss}
            />
          )}
        </div>
      </div>

      <div className="border-line mt-8 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-ink-soft text-[0.875rem]">
          {dateKey && slot ? (
            <>
              <p className="text-ink flex items-center gap-2">
                <CalendarCheck className="text-accent-soft size-4" aria-hidden="true" />
                New appointment: <span className="font-medium">{formatDateLong(dateKey)}</span>
              </p>
              <p className="text-ink-muted mt-1 flex items-center gap-2">
                <Clock className="size-3.5" aria-hidden="true" />
                {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
              </p>
            </>
          ) : (
            <p className="text-ink-muted">Choose a date and a time to continue.</p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" size="lg" onClick={onDismiss} type="button">
            Keep current time
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleConfirm}
            disabled={!dateKey || !slot || unchanged || saving}
            type="button"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {saving ? 'Saving…' : 'Confirm new time'}
          </Button>
        </div>
      </div>
    </div>
  );
}
