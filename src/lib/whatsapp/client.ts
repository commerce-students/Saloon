import 'server-only';

/**
 * WhatsApp Business Cloud API client (server-only).
 *
 * Nothing here runs in the browser and no credentials are ever exposed: the
 * public "Chat on WhatsApp" button is a plain `wa.me` link (see
 * `src/config/clinic.ts`), while automated messages must go through this module
 * from a Server Action, route handler or scheduled job.
 *
 * STATUS: not connected. Without the `WHATSAPP_*` environment variables every
 * call throws `WhatsAppNotConfiguredError`, which callers handle gracefully —
 * the booking flow never depends on WhatsApp being live.
 *
 * To connect later:
 *   1. Create a WhatsApp Business account + phone number id in Meta Business.
 *   2. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_VERIFY_TOKEN.
 *   3. Submit the message templates in `templates.ts` for approval.
 *   4. Call `sendWhatsAppMessage()` from the appointment service (after the
 *      database transaction commits) or from a queue worker.
 */

export class WhatsAppNotConfiguredError extends Error {
  constructor() {
    super(
      'WhatsApp Business API is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to enable automated messages.',
    );
    this.name = 'WhatsAppNotConfiguredError';
  }
}

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;

  return {
    accessToken,
    phoneNumberId,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0',
  };
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppConfig() !== null;
}

export type WhatsAppMessage =
  | {
      /** Plain text — only allowed inside the 24-hour customer service window. */
      kind: 'text';
      to: string;
      body: string;
    }
  | {
      /** Template message — required for business-initiated notifications. */
      kind: 'template';
      to: string;
      templateName: string;
      languageCode: string;
      /** Ordered body parameters, e.g. the customer name, date and time. */
      bodyParameters: string[];
    };

export interface WhatsAppSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Sends one message. Throws `WhatsAppNotConfiguredError` when env vars are missing. */
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();
  if (!config) throw new WhatsAppNotConfiguredError();

  const payload =
    message.kind === 'text'
      ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.to,
          type: 'text',
          text: { preview_url: false, body: message.body },
        }
      : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.to,
          type: 'template',
          template: {
            name: message.templateName,
            language: { code: message.languageCode },
            components: [
              {
                type: 'body',
                parameters: message.bodyParameters.map((text) => ({ type: 'text', text })),
              },
            ],
          },
        };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // Never let a provider outage hang a booking request.
        signal: AbortSignal.timeout(10_000),
      },
    );

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return { ok: false, error: data.error?.message ?? `WhatsApp API error (${response.status})` };
    }

    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown WhatsApp API failure',
    };
  }
}
