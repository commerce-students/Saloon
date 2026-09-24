# Supabase integration

The site ships with a **demo backend** that needs no server. Everything is already
wired so that setting two environment variables switches booking, availability and
appointment management to a real Postgres database — no application rewrite.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

`getBookingBackend()` (`src/lib/booking/index.ts`) returns the Supabase
implementation as soon as those are present, and `/api/health` reports
`"bookingBackend": "supabase"`.

---

## 1. Apply the schema

Open the Supabase SQL editor and run [`../supabase/schema.sql`](../supabase/schema.sql),
or use the CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push          # applies supabase/schema.sql as a migration
```

The script is idempotent (`if not exists` / `do $$` guards) so it can be re-run
safely while the project is young.

### Tables

| Table              | Purpose                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `clinic_settings`  | Single row: time zone, slot interval, lead time, horizon, turnover buffer, single-room mode    |
| `services`         | Treatments: name, description, duration, price, currency, active, order                        |
| `staff`            | Team members, optional link to an `auth.users` record, active flag                             |
| `working_hours`    | Recurring opening sessions per weekday (morning and evening), clinic-wide or per staff member  |
| `blocked_periods`  | Holidays, training, days off, internal bookings — whole day or a time range                    |
| `customers`        | Name, phone (normalised for matching), email, notes                                            |
| `appointments`     | The booking itself: customer, service, staff, date, start/end, status, notes, management token |
| `notification_log` | Audit trail for WhatsApp messages (queued / sent / failed / skipped)                           |

`appointments` additionally carries three derived columns that make the
constraints possible:

- `appointment_period` — a generated `tsrange` (half-open `[start, end)`).
- `resource_key` — `coalesce(staff_id, sentinel-uuid)`, so unassigned bookings are
  still protected.
- `end_time` is computed by a trigger from the service duration, so a client can
  never stretch its own slot.

---

## 2. Double-booking prevention

This is a database guarantee, not application logic:

```sql
alter table public.appointments
  add constraint appointments_no_overlap_per_staff
  exclude using gist (resource_key with =, appointment_period with &&)
  where (status in ('pending', 'confirmed'));
```

- Requires the `btree_gist` extension (enabled by the schema).
- PostgreSQL serialises conflicting inserts, so if two customers submit the same
  slot at the same instant one succeeds and the other fails with SQLSTATE `23P01`
  (`exclusion_violation`).
- `create_appointment()` and `reschedule_appointment()` catch that code and raise
  a friendly `SLOT_UNAVAILABLE` error, which the UI turns into “Sorry, that time
  was taken moments ago” plus the next available slots.
- Cancelled, completed and no-show appointments are excluded from the constraint,
  so a cancelled slot is genuinely released.
- For a single-room clinic set `clinic_settings.single_room = true`, which adds a
  clinic-wide overlapping constraint.

Availability is still computed before insertion (so the customer only sees real
slots), but the constraint is what makes the guarantee absolute.

---

## 3. Row Level Security model

| Table                                 | `anon`      | `authenticated` (customer) | staff (`app_metadata.role` = admin/staff) |
| ------------------------------------- | ----------- | -------------------------- | ----------------------------------------- |
| `services`                            | read active | read active                | full                                      |
| `staff`                               | read active | read active                | admin: full                               |
| `working_hours`, `blocked_periods`    | —           | —                          | full                                      |
| `customers`                           | —           | —                          | full                                      |
| `appointments`                        | —           | —                          | full                                      |
| `clinic_settings`, `notification_log` | —           | —                          | full                                      |

Customers never read tables directly. Availability, booking, lookup, reschedule
and cancel go through `SECURITY DEFINER` functions with `set search_path = public`,
each of which re-validates the request:

| Function                                          | Called by | Notes                                                                          |
| ------------------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `get_day_availability(service, date, staff?)`     | anon      | Returns slots **and** the reason each one is unavailable                       |
| `get_month_availability(service, from, to)`       | anon      | Counts for the calendar grid                                                   |
| `get_next_available_date(service, from)`          | anon      | Powers “next available”                                                        |
| `create_appointment(...)`                         | anon      | Validates, upserts the customer, inserts, maps conflicts to `SLOT_UNAVAILABLE` |
| `get_appointment_by_token(token)`                 | anon      | The management credential, compared in the database                            |
| `find_appointment_by_reference(reference, phone)` | anon      | Requires **both** the code and the phone                                       |
| `reschedule_appointment(token, date, time)`       | anon      | Same guarantees as a new booking                                               |
| `cancel_appointment(token)`                       | anon      | Releases the slot, keeps the record                                            |
| `staff_set_appointment_status(id, status)`        | staff     | Confirm / complete / no-show                                                   |
| `staff_delay_appointment(id, minutes)`            | staff     | “Running Late”                                                                 |

`revoke all … from public` then `grant execute … to anon, authenticated` is
applied to each function, so the exposed API surface is explicit.

---

## 4. Staff accounts and roles

Roles live in `auth.users.raw_app_meta_data.role` — writable only with the service
role, so a customer can never promote themselves:

```sql
-- Promote an existing auth user (run with the service role / SQL editor)
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
 where email = 'manager@example.com';
```

The application checks it on the server:

```ts
// src/app/admin/... or any Server Action
const staff = await requireAdminUser(['admin', 'staff']);
if (!staff) return notFound(); // never render clinic data
```

Both layers matter: the app check gives a clean response, RLS makes the data safe
even if a check is forgotten.

---

## 5. Replacing the demo catalogue

The demo services live in `src/data/services.ts` and are clearly labelled in the
UI. When the clinic approves real content:

```sql
update public.services set active = false where name like '%Signature Facial%';

insert into public.services (name, description, duration_minutes, price, category, sort_order)
values
  ('<approved treatment>', '<approved description>', 60, 25.000, 'Face', 1),
  ...
```

Also set the real opening hours:

```sql
delete from public.working_hours;   -- remove the placeholder sessions
insert into public.working_hours (staff_id, weekday, start_time, end_time)
values (null, 6, '10:00', '13:00'), (null, 6, '16:00', '20:00');  -- etc.
```

and the clinic’s holidays in `blocked_periods`.

---

## 6. What the frontend expects

The Supabase backend maps database rows to the app’s types in
`src/lib/booking/supabase-mappers.ts`. If you change column names, update that
file (and `SERVICE_SELECT_COLUMNS`) — nothing else in the UI needs to know.

Type mapping notes:

- Postgres `time` arrives as `HH:MM:SS` and is normalised to `HH:MM`.
- `date` columns are handled as `YYYY-MM-DD` strings resolved in the clinic’s time
  zone, never as local `Date` objects.
- The RPC return shapes are snake_case; the mappers convert them once, at the
  boundary.

---

## 7. Migration path (recommended order)

1. Apply the schema in a staging project; run the SQL editor’s “Run and review”.
2. Point a preview deployment at staging and book a few appointments.
3. Replace the placeholder catalogue, working hours and holidays.
4. Create staff accounts and assign roles; build the admin screens
   (`docs/ADMIN_DASHBOARD.md`).
5. Connect WhatsApp (`docs/WHATSAPP.md`).
6. Delete the demo data module (`src/data/demo-availability.ts`) once the real
   backend is live — it is only referenced by the demo backend, so removing the
   import is enough.
