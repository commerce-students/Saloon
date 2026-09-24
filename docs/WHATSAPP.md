# WhatsApp

Two separate things, deliberately kept apart:

1. **The “Chat on WhatsApp” button** on the website — an ordinary `wa.me`
   click-to-chat link. No API, no credentials, nothing to configure beyond the
   clinic’s number.
2. **Automated notifications** — booking confirmations, reschedule and
   cancellation notices, reminders and the clinic’s “Running Late” updates, sent
   through the WhatsApp Business Cloud API from the server only.

**Current status: not connected.** No message is sent to anyone in this build. The
code path exists, is type-checked and is exercised by the API route, but every call
returns `skipped` with the exact message that _would_ be sent, so nothing pretends
to be live.

---

## 1. Click-to-chat button

```bash
NEXT_PUBLIC_CLINIC_WHATSAPP=+968XXXXXXXX
```

- `whatsappHref()` in `src/config/clinic.ts` builds `https://wa.me/<digits>?text=…`
  and validates the number; if it is blank or malformed the button renders in a
  disabled “available once the clinic confirms its number” state instead of a
  broken link.
- Nothing is hard-coded, and no API token is involved — a plain link cannot leak
  credentials.
- Contextual messages are pre-filled (for example, the confirmation screen
  includes the service, date, time and reference code).

---

## 2. Automated notifications

### Architecture

| File                                 | Responsibility                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/whatsapp/client.ts`         | Cloud API client. `server-only`, reads `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`, throws `WhatsAppNotConfiguredError` when unset |
| `src/lib/whatsapp/templates.ts`      | Message wording, template names and ordered parameters for Meta approval; `RUNNING_LATE_OPTIONS`                                            |
| `src/lib/whatsapp/notifications.ts`  | `notifyAppointment(event, appointment)` — never throws into a booking; returns `sent` / `skipped` / `failed`                                |
| `src/app/api/notifications/route.ts` | Staff-authenticated HTTP entry point (for a queue worker or the admin UI)                                                                   |
| `src/app/actions/notifications.ts`   | Server Action wrapper for the admin dashboard’s buttons                                                                                     |

Design rules:

- The access token lives only on the server. `server-only` turns an accidental
  client import into a build error.
- Sending happens **after** the appointment is committed, so a message is never
  sent for a booking that was not stored.
- A WhatsApp outage never fails a booking: failures are reported (`failed`) and can
  be retried from a queue, and the appointment simply appears in the admin list.
- Every message is written to `notification_log` with its status and provider id.

### Messages and templates

| Event        | Template name              | Body parameters             |
| ------------ | -------------------------- | --------------------------- |
| Confirmation | `appointment_confirmation` | name, date, time, reference |
| Reschedule   | `appointment_rescheduled`  | name, date, time            |
| Cancellation | `appointment_cancelled`    | name, date, time            |
| Reminder     | `appointment_reminder`     | name, date, time            |
| Running late | `appointment_running_late` | name, delay minutes         |

Wording (`templates.ts`):

> Hi [Customer], your appointment at Chic by Sisters Clinic is confirmed for
> [Date] at [Time]. Reference [Reference].

> Hi [Customer], your appointment at Chic by Sisters Clinic has been rescheduled
> to [Date] at [Time].

> Hi [Customer], your appointment at Chic by Sisters Clinic on [Date] at [Time]
> has been cancelled.

> Hi [Customer], your appointment at Chic by Sisters Clinic is running [N] minutes
> late. We appreciate your patience.

Business-initiated messages outside a 24-hour customer-service window **must** use
an approved template, so the wording above is what gets submitted to Meta; keep the
placeholder order identical to `buildTemplateParameters()`.

---

## 3. Switching it on

1. **Create the WhatsApp Business account** in Meta Business Manager and add a
   phone number; note the **phone number id**.
2. **Generate a permanent access token** (System User token with
   `whatsapp_business_messaging` permission).
3. **Submit the five templates** above for approval (category: _Utility_). Keep the
   number of variables in the same order.
4. **Set the environment variables** (server-side only):

   ```bash
   WHATSAPP_ACCESS_TOKEN=EAAG...
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   WHATSAPP_VERIFY_TOKEN=<random string you choose>
   WHATSAPP_API_VERSION=v21.0
   WHATSAPP_TEMPLATE_LANGUAGE=en
   ```

5. **Restart** and confirm `/api/health` reports `"whatsapp": "configured"`.
6. Send a test message from the admin area (once built) or:

   ```bash
   curl -X POST https://<your-domain>/api/notifications \
     -H 'Content-Type: application/json' \
     -H 'Cookie: <staff session cookie>' \
     -d '{"event":"confirmation","appointment":{ … }}'
   ```

### Optional webhook

To capture delivery receipts, add a route that answers Meta’s verification
challenge with `WHATSAPP_VERIFY_TOKEN`, then stores the payload in
`notification_log`. Never log the raw access token or full customer records.

---

## 4. “Running Late”

Specified for the admin dashboard (`docs/ADMIN_DASHBOARD.md`):

1. Staff open the appointment and press **Running Late**.
2. Options: **+10**, **+15**, **+20** minutes, or **Custom**.
3. `staff_delay_appointment(appointment_id, minutes)` shifts the appointment and
   records the delay (staff-only, re-checked in the database).
4. `notifyAppointment('running-late', appointment, { delayMinutes })` queues or
   sends the customer’s message.
5. The diary immediately reflects the new time, and the WhatsApp reminder uses the
   adjusted start.

Until the dashboard exists, `sendAppointmentNotification()` in
`src/app/actions/notifications.ts` is the call to reuse — it performs the same
authorisation and returns the skipped-message preview when WhatsApp is not
connected.

---

## 5. Reliability

- Retries: send from a queue (Supabase cron/Edge Function, QStash, or a worker) and
  retry `failed` rows from `notification_log` with exponential backoff.
- Idempotency: store the provider message id; never send the same event twice for
  the same appointment.
- Quiet hours: for a Muscat clinic, avoid reminders late at night; schedule them
  for the morning before the appointment.
- Fallback: the confirmation screen, the `wa.me` link and the phone number remain
  the working channels if the API is unavailable.
