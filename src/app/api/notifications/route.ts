import { NextResponse } from 'next/server';

import { getAdminUser } from '@/lib/supabase/server-client';
import { isWhatsAppConfigured } from '@/lib/whatsapp/client';
import { notifyAppointment } from '@/lib/whatsapp/notifications';
import { toNotificationContext } from '@/lib/whatsapp/notifications';
import { buildMessageBody, TEMPLATE_NAMES, type AppointmentEvent } from '@/lib/whatsapp/templates';
import type { Appointment } from '@/lib/booking/types';

/**
 * WhatsApp notification endpoint — the hook the future admin dashboard and the
 * booking pipeline will call.
 *
 * Design notes:
 *   • Server-side only; the WhatsApp access token never reaches the browser.
 *   • Requires a signed-in staff member (`getAdminUser`), so appointment
 *     notifications cannot be triggered by the public.
 *   • While WHATSAPP_* variables are empty it returns a `skipped` result with the
 *     message preview — the UI shows "WhatsApp not connected" rather than
 *     pretending a message was sent.
 *   • Never throws for a provider failure: callers get `{ status: 'failed' }` so
 *     a booking is never rolled back because of a messaging outage.
 *
 * Typical future wiring: after `create_appointment` commits, enqueue
 * `{ event: 'confirmation', appointmentId }` and let a worker call this.
 */

const EVENTS: AppointmentEvent[] = [
  'confirmation',
  'reschedule',
  'cancellation',
  'reminder',
  'running-late',
];

interface NotificationPayload {
  event?: string;
  appointment?: Partial<Appointment>;
  delayMinutes?: number;
}

export async function POST(request: Request) {
  const staff = await getAdminUser();
  if (!staff) {
    return NextResponse.json(
      { ok: false, error: 'unauthorised', message: 'Staff sign-in is required.' },
      { status: 401 },
    );
  }

  let payload: NotificationPayload;
  try {
    payload = (await request.json()) as NotificationPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json', message: 'Expected a JSON body.' },
      { status: 400 },
    );
  }

  const event = payload.event as AppointmentEvent;
  if (!event || !EVENTS.includes(event)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_event', message: `event must be one of: ${EVENTS.join(', ')}` },
      { status: 400 },
    );
  }

  const appointment = payload.appointment;
  if (!appointment?.customer?.phone || !appointment.dateKey || !appointment.startTime) {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_appointment',
        message: 'appointment.customer.phone, dateKey and startTime are required.',
      },
      { status: 400 },
    );
  }

  const result = await notifyAppointment(event, appointment as Appointment, {
    delayMinutes: payload.delayMinutes,
  });

  const context = toNotificationContext(appointment as Appointment, {
    delayMinutes: payload.delayMinutes,
  });

  return NextResponse.json(
    {
      ok: result.status === 'sent',
      status: result.status,
      template: TEMPLATE_NAMES[event],
      whatsappConfigured: isWhatsAppConfigured(),
      messageId: result.messageId,
      reason: result.reason,
      preview: buildMessageBody(event, context),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
