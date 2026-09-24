/**
 * Message templates for automated WhatsApp notifications.
 *
 * The wording below mirrors the messages the clinic will send. Two things must
 * happen before they go live:
 *   1. Each template must be submitted to Meta for approval, using
 *      `{{1}}`, `{{2}}` … placeholders in the same order as
 *      `buildTemplateParameters()` returns them.
 *   2. Set WHATSAPP_TEMPLATE_LANGUAGE (default `en`) to the approved language.
 *
 * Nothing is sent from the browser — see `client.ts`.
 */

import type { WhatsAppMessage } from './client';

export type AppointmentEvent =
  'confirmation' | 'reschedule' | 'cancellation' | 'reminder' | 'running-late';

export interface NotificationContext {
  customerName: string;
  serviceName: string;
  dateKey: string;
  startTime: string;
  /** Localised date, e.g. "Tuesday, 12 May 2026". */
  dateLabel: string;
  /** Localised time, e.g. "10:30 AM". */
  timeLabel: string;
  referenceCode: string;
  /** Minutes of delay for `running-late`. */
  delayMinutes?: number;
}

/** WhatsApp template names to register in Meta Business Manager. */
export const TEMPLATE_NAMES: Record<AppointmentEvent, string> = {
  confirmation: 'appointment_confirmation',
  reschedule: 'appointment_rescheduled',
  cancellation: 'appointment_cancelled',
  reminder: 'appointment_reminder',
  'running-late': 'appointment_running_late',
};

/** Plain-text versions (used inside the 24h session window and for previews). */
export function buildMessageBody(event: AppointmentEvent, context: NotificationContext): string {
  switch (event) {
    case 'confirmation':
      return `Hi ${context.customerName}, your appointment at Chic by Sisters Clinic is confirmed for ${context.dateLabel} at ${context.timeLabel}. Reference ${context.referenceCode}.`;
    case 'reschedule':
      return `Hi ${context.customerName}, your appointment at Chic by Sisters Clinic has been rescheduled to ${context.dateLabel} at ${context.timeLabel}. Reference ${context.referenceCode}.`;
    case 'cancellation':
      return `Hi ${context.customerName}, your appointment at Chic by Sisters Clinic on ${context.dateLabel} at ${context.timeLabel} has been cancelled.`;
    case 'reminder':
      return `Hi ${context.customerName}, a reminder of your appointment at Chic by Sisters Clinic on ${context.dateLabel} at ${context.timeLabel}.`;
    case 'running-late':
      return `Hi ${context.customerName}, your appointment at Chic by Sisters Clinic is running ${context.delayMinutes ?? 10} minutes late. We appreciate your patience.`;
  }
}

/** Ordered body parameters for the approved template. */
export function buildTemplateParameters(
  event: AppointmentEvent,
  context: NotificationContext,
): string[] {
  switch (event) {
    case 'confirmation':
      return [context.customerName, context.dateLabel, context.timeLabel, context.referenceCode];
    case 'reschedule':
      return [context.customerName, context.dateLabel, context.timeLabel];
    case 'cancellation':
      return [context.customerName, context.dateLabel, context.timeLabel];
    case 'reminder':
      return [context.customerName, context.dateLabel, context.timeLabel];
    case 'running-late':
      return [context.customerName, String(context.delayMinutes ?? 10)];
  }
}

export function buildTemplateMessage(
  event: AppointmentEvent,
  phone: string,
  context: NotificationContext,
): WhatsAppMessage {
  return {
    kind: 'template',
    to: phone,
    templateName: TEMPLATE_NAMES[event],
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en',
    bodyParameters: buildTemplateParameters(event, context),
  };
}

/** Delay options offered by the admin "Running Late" action. */
export const RUNNING_LATE_OPTIONS = [10, 15, 20] as const;
