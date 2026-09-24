# Security

Written for whoever runs this site next: what protects what, why it was built this
way, and what to check before and after launch.

---

## 1. Threat model in one page

| Asset                                                  | Who may see it                            | Control                                                          |
| ------------------------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------- |
| Appointment details (service, date, time, name, phone) | The customer who booked, and clinic staff | 32-byte management token validated server-side; staff role + RLS |
| Customer contact details                               | Clinic staff                              | No customer-facing read path; RLS blocks direct table access     |
| Availability                                           | Anyone                                    | Computed on demand; no customer data leaves the database         |
| Staff area                                             | Authenticated staff                       | Supabase Auth session, `app_metadata.role`, RLS                  |
| Service-role key, WhatsApp token                       | Nobody but the server                     | Server-only modules, environment variables, `server-only` guard  |

Realistic risks this design addresses:

1. **Guessing an appointment URL.** The token is 32 random bytes from
   `crypto.getRandomValues` / `gen_random_bytes` — 64 hex characters. Enumerating
   it is not feasible, and the lookup is a database comparison, not a hidden page.
2. **A leaked reference code.** `find_appointment_by_reference()` also requires the
   mobile number used to book, matched on the last 8 digits.
3. **Two customers booking the same slot.** A PostgreSQL exclusion constraint on
   the appointment range per resource, so a race produces one booking and one
   clear error — not two appointments in the same chair.
4. **A customer reaching the admin area.** The route is guarded on the server, and
   the database refuses table access without a staff role.
5. **Secrets leaking to the browser.** Nothing sensitive is prefixed
   `NEXT_PUBLIC_`; server modules import `server-only`, so an accidental client
   import breaks the build.
6. **Appointment pages appearing in search results.** `noindex` metadata plus an
   `X-Robots-Tag` header, and private routes are disallowed in `robots.txt` and
   omitted from the sitemap.

Out of scope here: physical security, payment data (no payments are taken), and
medical records (never stored by this system).

---

## 2. Appointment tokens

- Generated with the Web Crypto API (`crypto.randomUUID`,
  `crypto.getRandomValues`), or `gen_random_bytes(32)` in Postgres. `Math.random()`
  is never used for anything security-relevant.
- Length is configurable (`APPOINTMENT_TOKEN_BYTES`, minimum 16, default 32 bytes);
  the database stores it on the appointment row with a unique index.
- Treat it like a password: it appears once in the confirmation link, is stored
  locally in the customer’s browser, and is the only key to the appointment.
- The `/manage` hub lists only appointments saved **in that browser**, and the
  lookup path requires reference + phone. The token is never displayed in a list,
  sent to an analytics provider, or logged.

Operational advice: rotate a token if a customer reports a shared link (update
`manage_token`, which invalidates the old link), and prefer delivering it over
WhatsApp/SMS rather than email where possible.

---

## 3. Server-side authorisation

```ts
// Every future admin page / Server Action
const staff = await requireAdminUser(['admin', 'staff']);
if (!staff) return notFound();
```

- `getAdminUser()` reads the Supabase session from cookies (`@supabase/ssr`), calls
  `auth.getUser()` (which validates the JWT with Supabase rather than trusting the
  cookie), and returns the role from `app_metadata`.
- `app_metadata` can only be written with the service role, so a user cannot grant
  themselves staff access.
- Row Level Security is the second layer: even a forgotten check cannot expose
  another customer’s appointment, because `anon` has no table privileges.

**Explicitly not used:** hidden admin URLs, hardcoded credentials, client-side role
flags, or trusting anything the browser sends.

---

## 4. Data minimisation

Collected at booking: full name, mobile number, optional email, optional note.
Nothing else. Notes are operational (“running 5 minutes late”, “prefers the quiet
room”) — the form tells customers explicitly not to send clinical information, and
the clinic should keep medical detail in its own records.

Retention suggestion: keep appointments for accounting/recall purposes, then delete
or anonymise; delete a customer on request, keeping only the aggregate.

---

## 5. Secrets

| Secret                          | Where it lives                                         | Never                                                    |
| ------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server env, used by `src/lib/supabase/admin-client.ts` | In a `NEXT_PUBLIC_` variable, a Client Component, or Git |
| `WHATSAPP_ACCESS_TOKEN`         | Server env, used by `src/lib/whatsapp/client.ts`       | In the browser bundle or logs                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser (by design)                                    | Assumed to be secret — RLS is what protects the data     |
| Staff passwords                 | Supabase Auth                                          | In this repository                                       |

Rules for contributors:

- `.env` and every `.env*.local` variant are git-ignored; only `.env.example`
  (names and explanations) is committed.
- If a key is ever committed, rotate it immediately — history rewriting is not
  enough.
- Never paste production keys into an issue, a screenshot or a chat.

---

## 6. Application hardening already in place

- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: SAMEORIGIN`, restrictive `Permissions-Policy`
  (`next.config.ts`).
- `X-Robots-Tag: noindex, nofollow` on `/manage/*`, `/admin/*` and `/api/*`.
- Input validation on both sides: the same rules in
  `src/lib/booking/validation.ts` are used by the form and by the backend, plus
  `check` constraints in Postgres.
- Availability is recomputed at the moment of booking; the client cannot dictate a
  time, a duration or an end time.
- The public API surface is limited to eight RPCs, each granted explicitly.
- Errors shown to customers are generic and actionable; technical detail stays in
  server logs.

---

## 7. Before going live

- [ ] Apply `supabase/schema.sql` and confirm RLS is enabled on every table
      (the schema enables it; verify in the Supabase dashboard).
- [ ] Confirm the exclusion constraint exists:
      `select conname from pg_constraint where conname like 'appointments_no_overlap%';`
- [ ] Create staff accounts and roles; remove any test account.
- [ ] Set every environment variable in the hosting dashboard; confirm
      `/api/health` reports the right backend and that no secret is present in the
      client bundle (search the build output for the service-role key).
- [ ] Add a Content Security Policy at the edge (remember the Google Maps iframe).
- [ ] Enable Supabase backups and confirm the retention window.
- [ ] Consider rate limiting on `find_appointment_by_reference` and
      `create_appointment` (Supabase Edge Function or the platform’s WAF) to slow
      brute-force attempts.
- [ ] Decide the clinic’s cancellation policy wording and publish it.

---

## 8. If something goes wrong

1. **Suspected token leak for one appointment** — rotate `manage_token`; the old
   link stops working immediately.
2. **Leaked service-role key** — rotate it in Supabase, redeploy, then review
   `notification_log` and the Postgres logs for unexpected access.
3. **Spam bookings** — enable rate limiting, require a verified phone number at
   booking time (a Supabase Edge Function can send a one-time code), and review
   `customers` for patterns.
4. **Wrong appointment data** — correct it through the admin tools so the audit
   trail stays intact; never edit production rows by hand without recording why.

Report vulnerabilities privately to the clinic rather than in a public issue.
