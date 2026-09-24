import 'server-only';

import type { Appointment } from '@/lib/booking/types';
import { formatDateLong, formatTime } from '@/lib/booking/date';

import {
  buildMessageBody,
  buildTemplateMessage,
  TEMPLATE_NAMES,
  type AppointmentEvent,
  type NotificationContext,
} from './templates';
import { isWhatsAppConfigured, sendWhatsAppMessage, WhatsAppNotConfiguredError } from './client';

/**
 * Server-side notification service.
 *
 * Design rules:
 *   • Never throws into a booking request — a WhatsApp outage must not fail a
 *     booking. Failures are logged and can be retried from a queue.
 *   • Never called from a Client Component: the access token stays on the server.
 *   • Runs *after* the appointment is committed, so a message is never sent for
 *     an appointment that was not stored.
 *
 * Nothing is sent while `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` are
 * empty — `notifyAppointment()` reports `skipped` instead, and the UI shows the
 * on-screen confirmation only.
 */

export interface NotifyResult {
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
  messageId?: string;
}

export function toNotificationContext(
  appointment: Appointment,
  options: { delayMinutes?: number } = {},
): NotificationContext {
  return {
    customerName: appointment.customer.name.split(' ')[0] ?? appointment.customer.name,
    serviceName: appointment.serviceName,
    dateKey: appointment.dateKey,
    startTime: appointment.startTime,
    dateLabel: formatDateLong(appointment.dateKey),
    timeLabel: formatTime(appointment.startTime),
    referenceCode: appointment.referenceCode,
    delayMinutes: options.delayMinutes,
  };
}

export async function notifyAppointment(
  event: AppointmentEvent,
  appointment: Appointment,
  options: { delayMinutes?: number } = {},
): Promise<NotifyResult> {
  const context = toNotificationContext(appointment, options);

  if (!isWhatsAppConfigured()) {
    return {
      status: 'skipped',
      reason: `WhatsApp not configured — "${TEMPLATE_NAMES[event]}" message was not sent. Preview: ${buildMessageBody(event, context)}`,
    };
  }

  try {
    const result = await sendWhatsAppMessage(
      buildTemplateMessage(event, appointment.customer.phone, context),
    );

    if (!result.ok) {
      return { status: 'failed', reason: result.error ?? 'Unknown WhatsApp error' };
    }
    return { status: 'sent', messageId: result.messageId };
  } catch (error) {
    if (error instanceof WhatsAppNotConfiguredError) {
      return { status: 'skipped', reason: error.message };
    }
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Unknown notification failure',
    };
  }
}
