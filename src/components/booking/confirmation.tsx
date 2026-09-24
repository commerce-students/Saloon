'use client';

import { CalendarPlus, Check, Download, MessageCircle, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { clinic, clinicLocationLine, whatsappHref } from '@/config/clinic';
import { addToCalendar, downloadIcsFile } from '@/lib/booking/calendar';
import { formatDateLong, formatDuration, formatTime } from '@/lib/booking/date';
import { saveRecentAppointment } from '@/lib/booking/recent-appointments';
import type { Appointment } from '@/lib/booking/types';

import { BookingSummary } from './booking-summary';

/**
 * Success screen.
 *
 * Reassuring rather than celebratory: the appointment details are the hero, the
 * management link is explained honestly (it lives on this device in the demo),
 * and WhatsApp is offered as a secondary way to reach the clinic.
 */
export function Confirmation({ appointment }: { appointment: Appointment }) {
  const [copied, setCopied] = useState(false);
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  useEffect(() => {
    saveRecentAppointment({
      manageToken: appointment.manageToken,
      referenceCode: appointment.referenceCode,
      serviceName: appointment.serviceName,
      dateKey: appointment.dateKey,
      startTime: appointment.startTime,
      status: appointment.status,
      savedAt: new Date().toISOString(),
    });

    // Read the origin after mount so server and client markup always match.
    setManageUrl(`${window.location.origin}/manage/${appointment.manageToken}`);
  }, [appointment]);

  const managePath = `/manage/${appointment.manageToken}`;
  const whatsapp = whatsappHref(
    `Hello ${clinic.name}, I have booked ${appointment.serviceName} on ${formatDateLong(
      appointment.dateKey,
    )} at ${formatTime(appointment.startTime)}. My reference is ${appointment.referenceCode}.`,
  );

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(appointment.referenceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col items-center text-center">
        <span className="text-success grid size-14 place-items-center rounded-full border border-[#c9dbd0] bg-[#f2f7f4]">
          <Check className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-serif text-[2rem] leading-tight sm:text-[2.5rem]">
          Your appointment is confirmed.
        </h1>
        <p className="text-ink-soft mt-4 max-w-md text-[1.0625rem] leading-relaxed">
          We look forward to seeing you at {clinic.name}, {clinicLocationLine}. A few minutes before
          your appointment is ideal — there is no need to arrive earlier.
        </p>
      </div>

      <div className="border-line bg-ivory mt-10 border px-5 py-6 sm:px-7" role="status">
        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
            <p className="text-eyebrow">Appointment reference</p>
            <p className="text-ink mt-1 font-serif text-[1.5rem] tracking-[0.06em]" dir="ltr">
              {appointment.referenceCode}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copyReference}>
            {copied ? 'Copied' : 'Copy reference'}
          </Button>
        </div>

        <BookingSummary
          serviceName={appointment.serviceName}
          serviceDurationMinutes={appointment.serviceDurationMinutes}
          dateKey={appointment.dateKey}
          time={appointment.startTime}
          customerName={appointment.customer.name}
          customerPhone={appointment.customer.phone}
        />

        <p className="text-ink-muted mt-5 text-[0.8125rem] leading-relaxed">
          Your appointment lasts {formatDuration(appointment.serviceDurationMinutes)} and finishes
          at {formatTime(appointment.endTime)}.{' '}
          {clinic.address ?? 'The full address will be confirmed by the clinic.'}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button variant="primary" size="lg" onClick={() => addToCalendar(appointment)}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          Add to Calendar
        </Button>
        <ButtonLink href={managePath} variant="outline" size="lg">
          <Settings2 className="size-4" aria-hidden="true" />
          Manage Appointment
        </ButtonLink>
        {whatsapp ? (
          <ButtonLink href={whatsapp} external variant="quiet" size="lg">
            <MessageCircle className="size-4" aria-hidden="true" />
            Chat on WhatsApp
          </ButtonLink>
        ) : null}
      </div>

      <div className="mt-4">
        <Button variant="link" size="sm" onClick={() => downloadIcsFile(appointment)}>
          <Download className="size-3.5" aria-hidden="true" />
          Download an .ics file for Apple or Outlook
        </Button>
      </div>

      <div className="border-line bg-cream/40 text-ink-soft mt-10 border px-5 py-5 text-[0.8125rem] leading-relaxed">
        <p className="text-ink font-medium">Keep your management link safe</p>
        <p className="mt-2">
          The link below is the only key to this appointment. Anyone who has it can view, reschedule
          or cancel the booking, so please don’t share it publicly. It is also saved on this device
          under{' '}
          <ButtonLink href="/manage" variant="link" className="text-[0.8125rem]">
            Manage appointment
          </ButtonLink>
          .
        </p>
        <p className="text-ink-muted mt-3 break-all" dir="ltr">
          {manageUrl ?? managePath}
        </p>
      </div>
    </div>
  );
}
