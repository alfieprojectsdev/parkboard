# ParkBoard

A parking-slot board for one condo, Lumiere Residences (LMR). A resident posts
when their slot is free (level, tower, time window). Logged-in neighbours
browse, tap "Show contact" to get the owner's phone or Viber, and arrange the
rest between themselves. The owner marks the slot taken or removes it.

There are no bookings, prices, payments or multiple communities; those were
cut in the v2 rewrite (see [docs/V2_CONTACT_BOARD_PLAN_20260617.md](docs/V2_CONTACT_BOARD_PLAN_20260617.md)).

![Browsing free slots as a logged-in resident, with one owner's contact revealed](docs/screenshots/v2/browse-with-contact.png)

On a phone: a slot as a logged-out visitor sees it (no contact), the same
slot as its owner sees it, posting a slot, and registering with the
residents' code.

<p>
  <img src="docs/screenshots/v2/slot-detail-logged-out.png" width="200" alt="Slot detail for a logged-out visitor: contact hidden behind login">
  <img src="docs/screenshots/v2/slot-detail-owner.png" width="200" alt="Owner's view with mark taken, edit and remove">
  <img src="docs/screenshots/v2/post-a-slot.png" width="200" alt="Post a slot form">
  <img src="docs/screenshots/v2/register-residents-code.png" width="200" alt="Registration asking for the residents' code">
</p>

Screenshots are from a local run on 2026-09-29 with made-up residents.
(`docs/screenshots/` also holds the v1 marketplace screenshots from October
2025.)

## Privacy model

- Anyone can see the list of free slots (location and times only).
- Owner names are shown to logged-in residents only.
- Phone and Viber come from one endpoint, `GET /api/slots/:id/contact`, which
  requires a login and allows 30 look-ups per resident per hour.
- Registration can require a residents' code (`SIGNUP_INVITE_CODE`) shared in
  the building group chat.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 3 with shadcn/ui
components, NextAuth v5 (email + password, JWT sessions), PostgreSQL via `pg`
(Neon in production), zod for validation, Vitest + PGlite for tests. Hosted on
Vercel.

## Local development

```bash
npm install
cp .env.example .env.local     # DATABASE_URL and AUTH_SECRET at minimum
npm run db:migrate             # applies db/migrations/*.sql
npm run dev                    # http://localhost:3000
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | Postgres connection string (Neon pooled URL in production) |
| `AUTH_SECRET` | yes | Signs session JWTs (`openssl rand -base64 32`); `NEXTAUTH_SECRET` also works |
| `SIGNUP_INVITE_CODE` | no | Residents' code required to register |
| `FEEDBACK_WEBHOOK_URL` | no | Discord webhook for the Feedback button |

## Checks

```bash
npm test            # Vitest against PGlite (Postgres in WASM), no database server needed
npm run typecheck
npm run lint
npm run build
```

GitHub Actions runs all four on every push and pull request.

## Operations

- Forgotten password: `DATABASE_URL=... npm run reset-password -- someone@example.com`
  prints a temporary password to send the resident privately.
- Feedback: `SELECT created_at, kind, message, contact, page FROM feedback ORDER BY created_at DESC;`
- Deploying, secrets and the September 2026 audit: [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md)

## Layout

```
app/api/            route handlers: auth, profile, slots (+ contact), feedback, health
app/LMR/slots/      browse, post, detail, edit
app/(auth)/         login, register
lib/auth/           NextAuth config (auth.config.ts is database-free for proxy.ts)
lib/slots.ts        slot queries (never select phone/Viber)
db/migrations/      numbered SQL, applied by scripts/migrate.mjs
test/               Vitest suites
```
