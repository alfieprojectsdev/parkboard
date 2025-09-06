# ParkBoard — MVP (Condo Parking Booking)

ParkBoard is a minimal parking booking web app for a small, vetted condo community. It follows a hotel-booking pattern (users, parking slots, bookings) and is built as an MVP using Supabase + Next.js + Tailwind.

Status: MVP-focused — frozen business rules for 30 days. See the development plan: [`parkboard_mvp_plan.md`](`parkboard_mvp_plan.md`)

---

## Quick links (open files)

- Supabase client: [`supabase`](src/lib/supabase.js) — [src/lib/supabase.js](src/lib/supabase.js)  
- Auth & session provider: [`AuthProvider`](components/AuthWrapper.js) — [components/AuthWrapper.js](components/AuthWrapper.js)  
- Resident UI: [`UserDashboard`](components/UserDashboard.js) — [components/UserDashboard.js](components/UserDashboard.js)  
- Admin UI: [`AdminDashboard`](components/AdminDashboard.js) — [components/AdminDashboard.js](components/AdminDashboard.js)  
- Booking form: [`BookingForm`](components/BookingForm.js) — [components/BookingForm.js](components/BookingForm.js)  
- Slot grid: [`SlotGrid`](components/SlotGrid.js) — [components/SlotGrid.js](components/SlotGrid.js)  
- Time picker: [`TimeRangePicker`](components/TimeRangePicker.js) — [components/TimeRangePicker.js](components/TimeRangePicker.js)  
- User bookings list: [`UserBookingsList`](components/UserBookingsList.js) — [components/UserBookingsList.js](components/UserBookingsList.js)  
- Booking confirmation: [`BookingConfirmation`](components/BookingConfirmation.js) — [components/BookingConfirmation.js](components/BookingConfirmation.js)

Database schema & helpers:
- Main schema (v2): [db/schema_v2.sql](db/schema_v2.sql)  
- RLS policies: [db/rls_policies.sql](db/rls_policies.sql)  
- Seed data: [db/seed_data.sql](db/seed_data.sql)  
- Useful queries: [db/useful_queries.sql](db/useful_queries.sql)  
- Reset script: [db/wipe_and_reset.sql](db/wipe_and_reset.sql)  
- Legacy schema (v1): [db/schema_v1.sql](db/schema_v1.sql)

MVP plan: [`parkboard_mvp_plan.md`](`parkboard_mvp_plan.md`)

---

## Tech stack

- Frontend: Next.js + React + Tailwind CSS  
- Backend: Next.js API routes (Supabase recommended for backend DB)  
- Database: Supabase / PostgreSQL with Row Level Security (RLS)  
- Auth: Supabase Auth + `user_profiles` table pattern

---

## Getting started (development)

1. Install dependencies
```sh
npm install
```

2. Configure environment (example vars in your `.env/.env.local`):
 - NEXT_PUBLIC_SUPABASE_URL
 - NEXT_PUBLIC_SUPABASE_ANON_KEY
The app uses the Supabase client exported as supabase.

3. Initialize database (Supabase SQL editor)
 - Run the schema: `db/schema_v2.sql`
 - Apply policies: `db/rls_policies.sql`
 - Insert seed data: `db/seed_data.sql`

4. Run the dev server

```sh
npm run dev
```

---

## Key developer notes
 - Business rules (frozen for MVP)
   - One active booking per resident
   - No double-booking — time range conflict checks in booking flows
   - No past bookings (1 hour grace allowed in DB constraint)
   - Admin override via admin UI
 
 - Client-side components use the Supabase client (supabase) directly for simplicity. See `AuthProvider` for session handling and role detection.

 - Booking conflict checks are implemented in UI helpers and should also be enforced server-side or via DB constraints/policies. See:
   - Booking creation UI: `BookingForm`
   - Slot availability UI: `SlotGrid`
   - Useful SQL for conflicts: db/useful_queries.sql

 - RLS is the backup security model. Ensure Supabase policies in db/rls_policies.sql are applied.

---

## Running database checks & queries
Check available slots for a time range: see db/useful_queries.sql
To reset dev DB (WARNING: destructive): db/wipe_and_reset.sql

---

## File map (high level)
 - /db — schema, policies, seeds, helper queries
   - db/schema_v2.sql
   - db/rls_policies.sql
 - /src/lib — shared clients
   - src/lib/supabase.js
 - /components — UI pieces & flows
   - components/AuthWrapper.js
   - components/UserDashboard.js
   - components/AdminDashboard.js
   - components/BookingForm.js
   - components/SlotGrid.js
   - components/TimeRangePicker.js
   - components/UserBookingsList.js
   - components/BookingConfirmation.js

---

## Testing & debugging tips
 - Use the Supabase SQL editor to run queries from `db/useful_queries.sql` when reproducing booking conflicts.
 - If a logged-in user cannot access their bookings, verify RLS policies in `db/rls_policies.sql` and confirm user_profiles exists for the auth user.
 - Timezone issues: components use ISO timestamps; ensure client and DB treat TIMESTAMPTZ consistently.
 
---

## Next steps (after MVP)
 - Email confirmations, recurring bookings, payments, and advanced reporting are nice-to-haves (see the checklist in `parkboard_mvp_plan.md`).
 - Harden server-side validation and introduce API routes for booking creation / slot listing to centralize business logic.

---

## Contributing
Follow the MVP plan in `parkboard_mvp_plan.md`. Keep changes small and focused on completing user flows (login → view slots → book → confirm).

---

## License
MIT (add LICENSE file if needed) 