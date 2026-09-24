'use client';

import { CalendarPlus, CalendarX2, Download, MessageCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { BookingSummary } from '@/components/booking/booking-summary';
import { Alert } from '@/components/ui/alert';
import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { clinic, whatsappHref } from '@/config/clinic';
import { getBookingBackend } from '@/lib/booking';
import { addToCalendar, downloadIcsFile } from '@/lib/booking/calendar';
import { formatDateLong, formatDuration, formatTime, todayKey } from '@/lib/booking/date';
import { updateRecentAppointmentStatus } from '@/lib/booking/recent-appointments';
import type { Appointment } from '@/lib/booking/types';

import { ReschedulePanel } from './reschedule-panel';

/**
 * "Your Appointment" — the single place a customer manages a booking.
 *
 * Authorisation is the unguessable token in the URL, verified by the backend.
 * Nothing is trusted from the client: cancel and reschedule both go back through
 * the backend with that token, which is exactly how the Supabase policies work
 * too (`get_appointment_by_token`, `cancel_appointment`, `reschedule_appointment`).
 */
export function ManageAppointment({ appointment: initial }: { appointment: Appointment }) {
  const backend = getBookingBackend();
  const [appointment, setAppointment] = useState(initial);
  const [rescheduling, setRescheduling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    updateRecentAppointmentStatus(appointment.manageToken, appointment.status);
  }, [appointment.manageToken, appointment.status]);

  const isCancelled = appointment.status === 'cancelled';
  const isPast = appointment.dateKey < todayKey();

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const updated = await backend.cancel(appointment.manageToken);
      if (updated) {
        setAppointment(updated);
        setNotice({
          tone: 'success',
          text: 'Your appointment has been cancelled. You can book a new one at any time.',
        });
      } else {
        setNotice({
          tone: 'error',
          text: 'We could not cancel the appointment. Please contact the clinic directly.',
        });
      }
    } catch {
      setNotice({
        tone: 'error',
        text: 'We could not cancel the appointment. Please try again in a moment.',
      });
    } finally {
      setCancelling(false);
      setConfirmingCancel(false);
    }
  };

  const whatsapp = whatsappHref(
    `Hello ${clinic.name}, I would like to discuss my appointment ${appointment.referenceCode}.`,
  );

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <Alert tone={notice.tone} live>
          {notice.text}
        </Alert>
      ) : null}

      <div className="border-line bg-ivory border">
        <div className="border-line flex flex-wrap items-start justify-between gap-4 border-b px-5 py-5 sm:px-6">
          <div>
            <p className="text-eyebrow">Your Appointment</p>
            <p className="text-ink mt-2 font-serif text-[1.5rem] leading-tight" dir="ltr">
              {appointment.referenceCode}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="px-5 py-2 sm:px-6">
          <BookingSummary
            serviceName={appointment.serviceName}
            serviceDurationMinutes={appointment.serviceDurationMinutes}
            dateKey={appointment.dateKey}
            time={appointment.startTime}
            customerName={appointment.customer.name}
            customerPhone={appointment.customer.phone}
          />
        </div>

        {appointment.notes ? (
          <p className="border-line text-ink-muted border-t px-5 py-4 text-[0.8125rem] leading-relaxed sm:px-6">
            <span className="text-ink-soft">Your notes: </span>
            {appointment.notes}
          </p>
        ) : null}
      </div>

      {isCancelled ? (
        <Alert tone="info" title="This appointment is cancelled">
          The time has been released. You can book again whenever you are ready.
        </Alert>
      ) : null}

      {isPast && !isCancelled ? (
        <Alert tone="info">
          This appointment date has passed. If you need a new appointment, please book again.
        </Alert>
      ) : null}

      {!rescheduling ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {!isCancelled ? (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setRescheduling(true)}
                disabled={isPast}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Reschedule
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setConfirmingCancel(true)}
                disabled={isPast}
              >
                <CalendarX2 className="size-4" aria-hidden="true" />
                Cancel Appointment
              </Button>
              <Button variant="quiet" size="lg" onClick={() => addToCalendar(appointment)}>
                <CalendarPlus className="size-4" aria-hidden="true" />
                Add to Calendar
              </Button>
            </>
          ) : (
            <ButtonLink href="/book" variant="primary" size="lg">
              Book a new appointment
            </ButtonLink>
          )}

          {whatsapp ? (
            <ButtonLink href={whatsapp} external variant="outline" size="lg">
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp the clinic
            </ButtonLink>
          ) : null}
        </div>
      ) : (
        <ReschedulePanel
          appointment={appointment}
          onDismiss={() => setRescheduling(false)}
          onRescheduled={(updated) => {
            setAppointment(updated);
            setRescheduling(false);
            setNotice({
              tone: 'success',
              text: `Your appointment has been moved to ${formatDateLong(updated.dateKey)} at ${formatTime(
                updated.startTime,
              )}.`,
            });
          }}
        />
      )}

      {!isCancelled ? (
        <p className="text-ink-muted text-[0.8125rem] leading-relaxed">
          Appointments last {formatDuration(appointment.serviceDurationMinutes)}.{' '}
          {appointment.staffName ? `You are booked with ${appointment.staffName}. ` : ''}
          Need a different treatment as well? Book it separately so each appointment keeps its full
          time.
        </p>
      ) : null}

      <div className="border-line flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="link" size="sm" onClick={() => downloadIcsFile(appointment)}>
          <Download className="size-3.5" aria-hidden="true" />
          Download .ics
        </Button>
        <Link
          href="/manage"
          className="text-ink-muted hover:border-accent hover:text-accent border-b border-transparent text-[0.8125rem] transition-colors"
        >
          Other appointments on this device
        </Link>
      </div>

      <Dialog
        open={confirmingCancel}
        onClose={() => setConfirmingCancel(false)}
        title="Are you sure you want to cancel this appointment?"
        description={`${appointment.serviceName} · ${formatDateLong(appointment.dateKey)} at ${formatTime(
          appointment.startTime,
        )}. The time is released immediately, and you can book again at any time.`}
        confirmLabel={cancelling ? 'Cancelling…' : 'Cancel Appointment'}
        cancelLabel="Keep Appointment"
        onConfirm={handleCancel}
        tone="danger"
      >
        <p className="text-ink-muted text-[0.8125rem] leading-relaxed">
          If you would rather move the appointment than cancel it, choose “Keep Appointment” and use
          Reschedule instead.
        </p>
      </Dialog>
    </div>
  );
}
