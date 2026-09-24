# Deployment

The project is a standard Next.js 15 application. It runs as a Node server (or on
an edge/Node serverless platform) and needs **no database** to start — the demo
booking backend is used until Supabase is configured.

---

## 1. Before you deploy

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

All five must pass. The build also validates every server-rendered page, the
generated Open Graph image and the sitemap.

Decide on these values first:

| Variable                | Notes                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | The production origin, e.g. `https://chicbysisters.om`. Used for canonical URLs, Open Graph and the sitemap — set it, or share previews will point at localhost. |
| `NEXT_PUBLIC_CLINIC_*`  | Address, phone, WhatsApp, email, map query. Leave blank to keep the honest “to be confirmed” placeholders.                                                       |
| `NEXT_PUBLIC_BOOKING_*` | Slot interval, lead time, horizon. Defaults are fine to start.                                                                                                   |

Do **not** put secrets in a `NEXT_PUBLIC_` variable: those are compiled into the
browser bundle.

---

## 2. Vercel (recommended)

1. Push the repository to GitHub.
2. **New Project → Import Git Repository** → select
   `chic-by-sisters-clinic-booking`.
3. Framework preset: **Next.js** (auto-detected). Build command `npm run build`;
   install command `npm ci`.
4. **Environment Variables** → add the values from `.env.example` for Production,
   Preview and Development as appropriate.
5. **Deploy**, then check `/api/health`:

   ```json
   {
     "status": "ok",
     "integrations": {
       "bookingBackend": "demo",
       "supabase": "not_configured",
       "whatsapp": "not_configured"
     }
   }
   ```

6. Add the custom domain and confirm `NEXT_PUBLIC_SITE_URL` matches it exactly
   (no trailing slash).

---

## 3. Netlify

1. `npm i -D @netlify/plugin-nextjs`, then create `netlify.toml`:

   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

2. Add the environment variables in **Site settings → Environment variables**.
3. Deploy. Image optimisation and route handlers are handled by the plugin.

---

## 4. Docker / self-hosted

Next.js can run as a plain Node server. A minimal `Dockerfile` (not committed by
default — add it if your host needs it):

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t chic-booking .
docker run -p 3000:3000 --env-file .env.local chic-booking
```

Notes for bare-metal/VM deployments:

- Run behind a reverse proxy (nginx, Caddy) that terminates TLS and forwards
  `Host` and `X-Forwarded-Proto`.
- `npm start` honours `PORT` (default 3000). Bind to `0.0.0.0`.
- Add a process manager (systemd, PM2) or run the container with
  `--restart unless-stopped`.
- Health checks: `GET /api/health` returns 200 with a small JSON body.

---

## 5. Response headers

`next.config.ts` already sends:

- `X-Robots-Tag: noindex, nofollow` for `/manage/*`, `/admin/*` and `/api/*` —
  private routes must never appear in search results.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: SAMEORIGIN`, and a restrictive `Permissions-Policy`.

If your proxy adds headers, keep these. A Content Security Policy is best added at
the edge once the clinic’s analytics/tag choices are known — note that the map
embed loads from `google.com` and the WhatsApp button links out to `wa.me`.

---

## 6. Post-deploy checklist

- [ ] Home, Services, Book, Location load on a phone and a desktop.
- [ ] The full booking journey completes and the confirmation shows the right
      date, time and reference.
- [ ] Add to Calendar opens Google Calendar / downloads a valid `.ics`.
- [ ] Reschedule and cancel work from the management link.
- [ ] `/manage` lookup rejects a wrong phone number for a valid reference.
- [ ] WhatsApp button is either a working `wa.me` link or clearly marked
      “available once the clinic confirms its number”.
- [ ] `/sitemap.xml` and `/robots.txt` list only public pages and use the
      production domain.
- [ ] Sharing the home page on WhatsApp/LinkedIn shows the branded Open Graph
      image.
- [ ] Lighthouse (mobile): performance and accessibility both ≥ 90.
- [ ] `/api/health` reports the intended backend (`demo` or `supabase`).

---

## 7. Rollback

The app is stateless. To roll back, redeploy the previous build (Vercel keeps
immutable deployments) — no data migration is involved until Supabase is
connected. Once appointments live in the database, treat the schema as
production data: apply changes with reviewed migrations and take a backup before
deploying.
