# Chic by Sisters Clinic — Appointment Booking

A premium, mobile-first appointment-booking website for **Chic by Sisters Clinic**,
a women’s aesthetics and beauty clinic in **Muscat, Oman**.

The booking experience — not the marketing pages — is the product: a five-step
wizard (Service → Date → Time → Details → Confirm), an immediate confirmation with
calendar export, and a secure self-service page where a customer can reschedule or
cancel without phoning the clinic.

> **Demo build.** The site runs without a database: services are clearly-labelled
> placeholders, availability is generated sample data, and appointments are stored
> in the visitor’s own browser. Nothing is sent to the clinic, and no real clinic
> information (address, phone, WhatsApp number, prices, staff) has been invented —
> every one of those values is an environment variable with a visible placeholder
> until the clinic supplies it.

---

## Contents

- [Feature overview](#feature-overview)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [How booking works](#how-booking-works)
- [Connecting Supabase](#connecting-supabase)
- [WhatsApp automation](#whatsapp-automation)
- [Admin dashboard & authentication](#admin-dashboard--authentication)
- [Testing](#testing)
- [Publishing to GitHub](#publishing-this-project-to-github)
- [Deployment](#deployment)
- [Content & business-information checklist](#content--business-information-checklist)
- [Accessibility & performance](#accessibility--performance)
- [Security notes](#security-notes)
- [Documentation](#documentation)

---

## Feature overview

**Booking (the centrepiece)**

- Five-step wizard with a progress indicator you can step back through.
- Service step: duration, price (when published) and description for each treatment.
- Calendar step: a real month grid where closed and fully-booked days are visible
  but not selectable, with a “next available” shortcut.
- Time step: available slots alongside unavailable ones (crossed out, never
  silently hidden), grouped by morning and evening.
- Details step: four fields, inline validation, optional email and notes.
- Confirm step: full appointment summary with “change” links on every row.
- Confirmation: reference code, add-to-calendar (Google/ICS), WhatsApp, and the
  secure management link.

**Managing an appointment**

- `/manage/[token]` — the token is the credential; the backend decides what it
  returns. Nothing is authorised in the browser.
- Reschedule with the same availability rules as a new booking.
- Cancel behind an explicit “Are you sure?” dialog.
- `/manage` hub: appointments booked from this device, plus lookup by reference
  code **and** the mobile number used to book.

**Everything else**

- Sticky premium header that compacts on scroll, mobile drawer, thumb-reachable
  mobile booking bar.
- Services section, five-step explainer, experience section, WhatsApp CTA and a
  location section with an approximate map until the real address is provided.
- SEO: metadata, Open Graph image rendered at build time, `sitemap.xml`,
  `robots.txt`, `BeautySalon` structured data (emitted only from confirmed values).
- Accessibility and performance are treated as requirements, not extras — see
  [Accessibility & performance](#accessibility--performance).

---

## Tech stack

| Concern       | Choice                                          | Why                                                                                |
| ------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Framework     | Next.js 15 (App Router)                         | Server rendering for SEO, route handlers and Server Actions for later backend work |
| Language      | TypeScript (strict, `noUncheckedIndexedAccess`) | Refactors that fail loudly instead of quietly                                      |
| Styling       | Tailwind CSS v4                                 | Design tokens in `src/app/globals.css`, no runtime CSS-in-JS                       |
| Fonts         | Self-hosted Cormorant Garamond + Jost           | No third-party font CDN, no visitor data leakage, no layout shift                  |
| Data (future) | Supabase (Postgres + Auth + RLS)                | See [`supabase/schema.sql`](supabase/schema.sql)                                   |
| Tests         | Vitest                                          | Availability engine, time-zone maths, validation, calendar export                  |
| Icons         | lucide-react                                    | Tree-shaken SVG icons                                                              |

---

## Getting started

```bash
# 1. Requirements: Node.js 20.9+ (see .nvmrc)
node --version

# 2. Install dependencies
npm install

# 3. Copy the environment template (the app runs fine with everything empty)
cp .env.example .env.local

# 4. Start the development server
npm run dev          # http://localhost:3000
```

Useful scripts:

| Script                    | What it does                                                                |
| ------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`             | Development server                                                          |
| `npm run build`           | Production build (includes type checking)                                   |
| `npm start`               | Serve the production build                                                  |
| `npm run lint`            | ESLint (Next.js core-web-vitals + TypeScript rules)                         |
| `npm run typecheck`       | `tsc --noEmit`                                                              |
| `npm test`                | Vitest suite (availability, dates, validation, demo booking lifecycle, ICS) |
| `npm run format`          | Prettier, including the Tailwind class-order plugin                         |
| `npm run images:optimize` | Re-encode the placeholder images in `src/assets`                            |

No database, account or API key is required to run the project — the demo backend
takes over automatically.

> Run `npm run build` on its own: the production build and `next dev` share the
> `.next` directory, so building while the dev server is running can leave the dev
> bundle inconsistent (delete `.next` and restart if that happens).

---

## Environment variables

Copy `.env.example` to `.env.local`. **Nothing is required for the demo**, and no
secret is ever committed — the repository ships with the template only.

| Variable                        | Scope      | Purpose                                                        |
| ------------------------------- | ---------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | public     | Canonical URL used by metadata, Open Graph and the sitemap     |
| `NEXT_PUBLIC_CLINIC_PHONE`      | public     | Clinic phone; empty ⇒ a “to be confirmed” placeholder is shown |
| `NEXT_PUBLIC_CLINIC_WHATSAPP`   | public     | WhatsApp number for the `wa.me` chat button                    |
| `NEXT_PUBLIC_CLINIC_ADDRESS`    | public     | Street address; empty ⇒ placeholder + city-level map           |
| `NEXT_PUBLIC_CLINIC_MAP_QUERY`  | public     | Google Maps query for the embed                                |
| `NEXT_PUBLIC_CLINIC_EMAIL`      | public     | Contact email                                                  |
| `NEXT_PUBLIC_SUPABASE_URL`      | public     | Enables the Supabase booking backend                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public     | Safe in the browser — RLS protects the data                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | **server** | Trusted server jobs only (never exposed)                       |
| `WHATSAPP_ACCESS_TOKEN`         | **server** | WhatsApp Business Cloud API token                              |
| `WHATSAPP_PHONE_NUMBER_ID`      | **server** | WhatsApp Business sender id                                    |
| `WHATSAPP_VERIFY_TOKEN`         | **server** | Webhook verification                                           |
| `NEXT_PUBLIC_BOOKING_*`         | public     | Slot interval, lead time and booking horizon                   |

Anything prefixed `NEXT_PUBLIC_` is bundled into the browser. Secrets stay
unprefixed and are guarded by `import 'server-only'`.

---

## Project structure

```
src/
├── app/                  # App Router: pages, metadata, route handlers
│   ├── page.tsx          # Home
│   ├── services/         # Treatment list
│   ├── book/             # Booking wizard (?service= pre-selects a treatment)
│   ├── location/         # Visit us
│   ├── manage/           # Management hub + /manage/[token]
│   ├── admin/            # Guarded staff door (dashboard not built yet)
│   └── api/              # /api/health, /api/notifications
├── components/
│   ├── booking/          # BookingWizard, DatePicker, TimeSlotSelector,
│   │                     # CustomerDetails, BookingSummary, Confirmation, …
│   ├── manage/           # ManageAppointment, ReschedulePanel, lookup helpers
│   ├── layout/           # Header, MobileNavigation, Footer, MobileBookingBar
│   ├── sections/         # Hero, Services, ServiceCard, BookingSteps,
│   │                     # Approach, WhatsAppCTA, Location
│   └── ui/               # Button, Field, Dialog, Badge, Alert, Container, …
├── config/               # clinic.ts (contact details), booking.ts (rules)
├── data/                 # DEMO services, opening hours, seeded availability
├── hooks/                # useBookingFlow, useMonthAvailability, useScrolled
├── lib/
│   ├── booking/          # Domain logic: availability, dates, validation, ids,
│   │                     # backends (demo + Supabase), calendar export, catalog
│   ├── supabase/         # browser / server / service-role clients, config
│   ├── whatsapp/         # Cloud API client, message templates, notifications
│   └── format.ts, seo.ts
supabase/schema.sql       # Tables, RLS policies, booking RPCs, constraints
docs/                     # Deployment, Supabase, WhatsApp, admin, security
```

The booking UI never talks to a database directly. It talks to the
`BookingBackend` interface (`src/lib/booking/backend.ts`); `getBookingBackend()`
returns the demo implementation or the Supabase implementation depending on the
environment. Swapping backends is a configuration change, not a rewrite.

---

## How booking works

```
Service → Date → Time → Details → Confirm → Confirmation
                                              ↓
                                   /manage/[token]
                              (view · reschedule · cancel)
```

1. **Availability** (`src/lib/booking/availability.ts`) is a pure function of
   opening hours, breaks, blocked time, existing appointments, service duration,
   lead time and booking horizon. It is reused by both backends, so the demo and
   the database cannot drift apart.
2. **Non-availability is shown, not hidden.** Slots that are booked, past or
   blocked come back with `available: false` and a reason, so the customer sees
   the shape of their day.
3. **Re-validation on submit.** The backend checks the slot again at the moment of
   booking. If it was taken, the customer is told and offered the next available
   times instead of a silent failure.
4. **Date handling.** Calendar dates are `YYYY-MM-DD` strings resolved in the
   clinic’s time zone (`Asia/Muscat`), never `Date` objects in the visitor’s
   timezone — which is what usually causes “my appointment shows the wrong day”.
5. **Authorisation.** The management token is 32 random bytes from `crypto`
   (never `Math.random`). It is the only key to an appointment; hiding a URL is
   never treated as security.

---

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates
   the tables (`services`, `staff`, `working_hours`, `blocked_periods`,
   `customers`, `appointments`, `notification_log`), enables Row Level Security,
   and adds the customer-facing RPCs plus the constraints that make double booking
   impossible.
3. Set the two public variables in `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

4. Restart the dev server. `/api/health` should now report
   `"bookingBackend": "supabase"`.

`getBookingBackend()` switches automatically — no code change is required. Then
replace the placeholder catalogue with the clinic’s approved treatments (SQL
insert, or the future admin → Services screen).

Full detail, including the double-booking guarantee and the RLS model, is in
[`docs/SUPABASE.md`](docs/SUPABASE.md).

---

## WhatsApp automation

WhatsApp is **not connected** in this build. The public “Chat on WhatsApp” button
is an ordinary `wa.me` click-to-chat link that becomes active as soon as
`NEXT_PUBLIC_CLINIC_WHATSAPP` is set — no API and no credentials involved.

Automated messages (confirmation, reschedule, cancellation, reminder, and the
clinic’s “Running Late” updates) are implemented and ready to switch on:

- `src/lib/whatsapp/client.ts` — Cloud API client, **server-only**.
- `src/lib/whatsapp/templates.ts` — the exact message wording and template
  parameters to submit to Meta for approval.
- `src/lib/whatsapp/notifications.ts` — notification service that never throws
  into a booking request.
- `src/app/api/notifications/route.ts` and
  `src/app/actions/notifications.ts` — the staff-authenticated entry points.

Until `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set, every call
returns `skipped` with the message preview rather than pretending a message was
sent. See [`docs/WHATSAPP.md`](docs/WHATSAPP.md).

---

## Admin dashboard & authentication

The dashboard is not built yet, and it is deliberately absent from the public
navigation. What exists is the security architecture it will sit on:

- `/admin` (`src/app/admin/page.tsx`) is server-rendered, `noindex`, and calls
  `getAdminUser()`; an unauthenticated visitor sees nothing.
- `requireAdminUser()` in `src/lib/supabase/server-client.ts` is the guard every
  future admin page and Server Action calls first.
- Staff roles live in Supabase Auth `app_metadata.role` (`admin`, `staff`,
  `viewer`) and are enforced again by RLS policies in the database — hidden URLs,
  hardcoded passwords and client-side checks are explicitly _not_ used.
- `supabase/schema.sql` already contains the staff operations the dashboard needs,
  including `staff_set_appointment_status()` and `staff_delay_appointment()` for
  the “Running Late” action.

The full screen-by-screen specification is in
[`docs/ADMIN_DASHBOARD.md`](docs/ADMIN_DASHBOARD.md).

---

## Testing

```bash
npm test          # Vitest: availability engine, date/time zones, validation, ICS
npm run lint      # ESLint
npm run typecheck # TypeScript
npm run build     # Production build
```

The suite covers the parts most likely to break quietly: session boundaries,
lead time, turnover buffers, blocked periods, reschedule exclusions, month grids,
time-zone conversion (Muscat is UTC+4 — a classic source of off-by-one-day bugs),
phone/reference normalisation, iCalendar export, and the complete demo booking
lifecycle (book → double-booking refused → reschedule → cancel → lookup).

**Manual checklist** before a release: navigation, mobile drawer, service → date →
time → details → confirm, validation errors, confirmation, add-to-calendar,
reschedule, cancel dialog, `/manage` lookup, location links, WhatsApp button,
empty and error states, and the build itself.

---

## Publishing this project to GitHub

This working copy lives on the branch `arena/01a0d4e7-saloon`. To publish it as its
own repository named **`chic-by-sisters-clinic-booking`**:

```bash
# Option A — helper script (creates the repo, adds remote `clinic`, pushes main)
gh auth login
./scripts/publish-to-github.sh                 # or: ./scripts/publish-to-github.sh <owner>

# Option B — by hand
gh repo create chic-by-sisters-clinic-booking --public \
  --description "Appointment-booking website for Chic by Sisters Clinic (Muscat, Oman)"
git remote add clinic https://github.com/<owner>/chic-by-sisters-clinic-booking.git
git push clinic HEAD:main
```

Both routes refuse to run while an environment file is tracked by git. Before
pushing, confirm:

```bash
npm test && npm run lint && npm run typecheck && npm run build
git ls-files | grep -E '\.env'      # should list only .env.example
```

---

## Deployment

Any Node host works. Vercel is the shortest path:

1. Push the repository to GitHub.
2. In Vercel: **New Project → Import** the repository.
3. Add the environment variables from `.env.example` (at minimum
   `NEXT_PUBLIC_SITE_URL`).
4. Deploy. Build command `npm run build`, output handled automatically.

Netlify, Cloudflare, Docker and self-hosted Node instructions — including a
`Dockerfile` outline and the `X-Robots-Tag` headers for private routes — are in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Content & business-information checklist

Nothing about the real clinic has been invented. Before launch, supply:

- [ ] The clinic’s approved treatment list, durations and prices
      (`src/data/services.ts` or the Supabase `services` table).
- [ ] The exact street address (`NEXT_PUBLIC_CLINIC_ADDRESS`) and map pin
      (`NEXT_PUBLIC_CLINIC_MAP_QUERY`).
- [ ] Phone and WhatsApp numbers (`NEXT_PUBLIC_CLINIC_PHONE`,
      `NEXT_PUBLIC_CLINIC_WHATSAPP`).
- [ ] Real opening hours (`src/data/schedule.ts` / `working_hours` table) and
      holidays (`blocked_periods`).
- [ ] Approved photography to replace `src/assets/*.jpg` (see
      [`src/assets/README.md`](src/assets/README.md)).
- [ ] Confirmation of the clinic’s cancellation policy wording.

Reviews, awards, certifications, staff names, before/after imagery and medical
claims are intentionally absent: none of them can be published until the clinic
confirms them.

---

## Accessibility & performance

- Semantic landmarks, one `h1` per page, logical heading order.
- Every control is keyboard reachable with a visible focus ring; the booking flow
  moves focus to the step heading on each transition.
- Form fields are labelled, errors are announced (`role="alert"`), and
  `aria-describedby` links hints to inputs.
- Dialogs use the native `<dialog>` element, which provides focus trapping,
  Escape-to-close and inert background content.
- Contrast targets WCAG AA; unavailable times are never communicated by colour
  alone (they are struck through and labelled).
- `prefers-reduced-motion` disables all animation.
- Self-hosted subset fonts (≈100 KB total), AVIF/WebP images, `next/image`
  responsive sizes, a lazy-loaded map iframe and a small shared JS bundle
  (≈103 KB first load, ≈112 KB on the home page).

---

## Security notes

- No secret is committed. `.env.local` and every variant is git-ignored;
  `.env.example` contains names and explanations only.
- Server-only modules (`src/lib/supabase/*`, `src/lib/whatsapp/*`) import
  `server-only`, so an accidental client import fails the build.
- The service-role key and WhatsApp token are never sent to the browser.
- Appointment access requires a 32-byte token validated server-side; lookups
  require the reference code **and** the booking phone number.
- Private routes (`/manage/*`, `/admin`, `/api/*`) send `X-Robots-Tag: noindex`
  and are excluded from `robots.txt` and the sitemap.
- The database mirrors these rules with Row Level Security — see
  [`docs/SECURITY.md`](docs/SECURITY.md).

Report a suspected vulnerability privately to the clinic rather than in a public
issue.

---

## Documentation

| Document                                             | Contents                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)           | Vercel, Netlify, Docker, self-hosting, environment setup, post-deploy checks |
| [`docs/SUPABASE.md`](docs/SUPABASE.md)               | Schema, RLS model, RPC reference, double-booking guarantee, migration path   |
| [`docs/WHATSAPP.md`](docs/WHATSAPP.md)               | Cloud API setup, template submission, “Running Late”, queueing and retries   |
| [`docs/ADMIN_DASHBOARD.md`](docs/ADMIN_DASHBOARD.md) | Screens, permissions, staff workflows, roadmap                               |
| [`docs/SECURITY.md`](docs/SECURITY.md)               | Threat model, token design, RLS, secrets handling, incident checklist        |

---

## License

MIT — see [`LICENSE`](LICENSE).
