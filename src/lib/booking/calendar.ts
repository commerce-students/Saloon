/** "Add to Calendar" helpers: Google Calendar link and a downloadable .ics file. */

import { clinic } from '@/config/clinic';

import { clinicDateTimeToUtc, formatUtcStamp } from './date';
import type { Appointment } from './types';

function summarise(appointment: Appointment): {
  title: string;
  description: string;
  location: string;
} {
  return {
    title: `${appointment.serviceName} — ${clinic.name}`,
    description: [
      `Your appointment reference is ${appointment.referenceCode}.`,
      'Please arrive a few minutes early. To change or cancel this appointment, use the management link from your confirmation.',
    ].join('\n'),
    location: clinic.address ?? `${clinic.city}, ${clinic.country}`,
  };
}

function bounds(appointment: Appointment): { start: Date; end: Date } {
  return {
    start: clinicDateTimeToUtc(appointment.dateKey, appointment.startTime),
    end: clinicDateTimeToUtc(appointment.dateKey, appointment.endTime),
  };
}

/** Opens Google Calendar with the appointment pre-filled. */
export function googleCalendarUrl(appointment: Appointment): string {
  const { start, end } = bounds(appointment);
  const { title, description, location } = summarise(appointment);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatUtcStamp(start)}/${formatUtcStamp(end)}`,
    details: description,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** iCalendar payload that works with Apple Calendar, Google Calendar and Outlook. */
export function buildIcsContent(appointment: Appointment): string {
  const { start, end } = bounds(appointment);
  const { title, description, location } = summarise(appointment);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chic by Sisters Clinic//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@chic-by-sisters-clinic`,
    `DTSTAMP:${formatUtcStamp(new Date())}`,
    `DTSTART:${formatUtcStamp(start)}`,
    `DTEND:${formatUtcStamp(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `STATUS:${appointment.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`${title} in 2 hours`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Triggers the download in the browser. No-op outside the browser. */
export function downloadIcsFile(appointment: Appointment): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([buildIcsContent(appointment)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chic-by-sisters-${appointment.referenceCode.toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Google Calendar link when possible, otherwise the .ics download. */
export function addToCalendar(appointment: Appointment): void {
  if (typeof window === 'undefined') return;
  window.open(googleCalendarUrl(appointment), '_blank', 'noopener,noreferrer');
}
