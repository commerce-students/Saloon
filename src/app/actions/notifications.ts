'use server';

import { requireAdminUser } from '@/lib/supabase/server-client';
import { isWhatsAppConfigured } from '@/lib/whatsapp/client';
import { notifyAppointment, toNotificationContext } from '@/lib/whatsapp/notifications';
import { buildMessageBody, type AppointmentEvent } from '@/lib/whatsapp/templates';
import type { Appointment } from '@/lib/booking/types';

/**
 * Server Action for staff-triggered notifications (for example the
 * "Running Late" buttons the admin dashboard will show).
 *
 * Server Actions run on the server, so the authorisation check below cannot be
 * bypassed from the browser, and no WhatsApp credential is ever shipped to the
 * client. Until the admin area exists this is intentionally unreachable from the
 * public site — the demo confirmation screen talks to the customer only.
 */
export interface NotificationResult {
  status: 'sent' | 'skipped' | 'failed' | 'unauthorised';
  message: string;
}

export async function sendAppointmentNotification(input: {
  event: AppointmentEvent;
  appointment: Appointment;
  delayMinutes?: number;
}): Promise<NotificationResult> {
  const staff = await requireAdminUser();
  if (!staff) {
    return { status: 'unauthorised', message: 'Staff sign-in is required.' };
  }

  const result = await notifyAppointment(input.event, input.appointment, {
    delayMinutes: input.delayMinutes,
  });

  if (result.status === 'sent') {
    return { status: 'sent', message: 'WhatsApp message sent.' };
  }

  if (result.status === 'skipped') {
    // Honest demo behaviour: show the message that *would* be delivered.
    return {
      status: 'skipped',
      message: `WhatsApp is not connected yet. Preview: “${buildMessageBody(
        input.event,
        toNotificationContext(input.appointment, { delayMinutes: input.delayMinutes }),
      )}”`,
    };
  }

  return { status: 'failed', message: result.reason ?? 'The message could not be sent.' };
}

/** Lets the admin UI show whether automation is live without exposing values. */
export async function whatsappStatus(): Promise<'connected' | 'not_connected'> {
  const staff = await requireAdminUser();
  if (!staff) return 'not_connected';
  return isWhatsAppConfigured() ? 'connected' : 'not_connected';
}
