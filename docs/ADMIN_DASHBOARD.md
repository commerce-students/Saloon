# Admin dashboard — specification and roadmap

The public booking website is complete. The staff dashboard is **not built**, and
it is intentionally absent from the public navigation. This document is the agreed
specification; the security architecture and database functions it needs already
exist, so implementation is additive.

---

## 1. What exists today

| Piece                          | Location                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Route with a server-side guard | `src/app/admin/page.tsx`                                                                       |
| Session + role check           | `getAdminUser()`, `requireAdminUser()` in `src/lib/supabase/server-client.ts`                  |
| Role storage                   | Supabase Auth `app_metadata.role` (`admin`, `staff`, `viewer`)                                 |
| Staff RPCs                     | `staff_set_appointment_status()`, `staff_delay_appointment()` in `supabase/schema.sql`         |
| Staff RLS policies             | `<table>_staff` policies — direct table access requires a staff role                           |
| Notification plumbing          | `src/lib/whatsapp/*`, `src/app/actions/notifications.ts`, `src/app/api/notifications/route.ts` |
| `noindex` + `X-Robots-Tag`     | `src/app/admin/page.tsx`, `next.config.ts`                                                     |

Everything below is new UI on top of those foundations.

---

## 2. Authentication

- **Supabase Auth** with email + password or magic link. No hardcoded passwords, no
  client-only checks, no “secret” admin URLs.
- Sign-in at `/admin/sign-in`; sessions are cookie-based and refreshed on the
  server with `@supabase/ssr`.
- A layout-level guard runs `requireAdminUser()` before any data is fetched. An
  unauthenticated request gets the sign-in page; a signed-in non-staff user gets a
  plain “not authorised” page.
- Invite staff from Supabase (Auth → Users), then set the role with the SQL snippet
  in `docs/SUPABASE.md` §4.
- Recommended later: MFA for `admin` accounts, and an audit row for every status
  change.

**Permissions**

| Capability                             | viewer | staff | admin |
| -------------------------------------- | ------ | ----- | ----- |
| View appointments / customers          | ✓      | ✓     | ✓     |
| Confirm, complete, no-show, reschedule | —      | ✓     | ✓     |
| Cancel appointments                    | —      | ✓     | ✓     |
| Running Late notification              | —      | ✓     | ✓     |
| Manage services & availability         | —      | —     | ✓     |
| Manage staff and roles                 | —      | —     | ✓     |

---

## 3. Screens

### 3.1 Today (landing)

- Counts: today’s appointments, upcoming, awaiting confirmation, cancelled.
- A chronological list of today’s diary: time, customer, service, duration, status.
- **Running Late** available directly on each row.

### 3.2 Appointments

- Filters: date range, status, service, staff member; search by name, phone or
  reference code.
- Actions per appointment: **Confirm**, **Reschedule**, **Cancel**, **Completed**,
  **No-show**, **Running Late**.
- Reschedule reuses the availability engine, so the same rules (duration, hours,
  breaks, blocked time, existing bookings) apply to staff edits.
- Cancelling asks for confirmation and offers “notify the customer on WhatsApp”.

### 3.3 Calendar

- Day view with a column per staff member (rooms later), showing appointment blocks
  proportional to duration.
- Drag to reschedule (later iteration); the database constraint still has the final
  say and a rejected move is explained in the UI.

### 3.4 Services

- Table of services: name, duration, price, currency, category, active, order.
- Add / edit / delete (soft delete via `active = false` when history exists).
- Changes appear on the website immediately — the public pages read the same table.

### 3.5 Staff

- Add / edit team members; active flag; optional link to an auth user.
- Working hours per weekday (multiple sessions per day, for example 10:00–13:00 and
  16:00–20:00).
- Days off and holidays write to `blocked_periods` (whole day or a time range).

### 3.6 Availability

- Weekly opening-hours editor writing to `working_hours`.
- Blocked time: holidays, team training, internal bookings, per clinic or per staff
  member.
- Booking rules in `clinic_settings`: slot interval, lead time, horizon, turnover
  buffer, single-room mode.

### 3.7 Customers

- Searchable list: name, phone, email, created date.
- Customer detail: appointment history (past and upcoming), notes, quick actions
  (book again, WhatsApp, call).
- Data minimisation: show only what is needed to run the appointment. Clinical
  notes do not belong in this database.

### 3.8 Running Late

- Prominent button on the appointment row and detail view.
- Options: **10 minutes**, **15 minutes**, **20 minutes**, **Custom…**
- Effects: `staff_delay_appointment()` shifts the appointment, the diary updates,
  and the customer receives the WhatsApp update (queued when WhatsApp is not
  connected, with the exact message shown to staff).
- If the shift would collide with the next appointment, the UI warns before saving
  and offers the next free slot.

---

## 4. Implementation approach

1. **Data layer** — Server Components + Server Actions. Every action starts with
   `requireAdminUser()`; every read relies on RLS for defence in depth. No service
   role key in request paths that a browser can reach.
2. **Lists** — server-rendered with search params for filters (shareable URLs, no
   client-side data fetching needed).
3. **Tables** — a small, locally owned table component; avoid a heavy data-grid
   dependency.
4. **Mutations** — Server Actions with `revalidatePath`, optimistic UI only where it
   is safe (status toggles), never for availability.
5. **Real-time (optional)** — Supabase Realtime on `appointments` for a live diary.
6. **Audit** — record who changed what: add an `appointment_events` table
   (appointment id, actor, action, before/after, timestamp).

Suggested order of work: Today → Appointments list + status actions → Services →
Availability → Staff → Customers → Calendar → Running Late notifications → audit
log.

---

## 5. Non-goals for now

- Payroll, inventory, clinical records, marketing automation, multi-branch support.
- Anything that would require the clinic to expose medical data to this system:
  appointment notes stay operational and brief.
