# ParkBoard AI Playbook (Copilot Instructions)

## Project Overview
ParkBoard is a condo parking booking web application built from first principles.  
This MVP replaces manual coordination (like Viber chats) with a database-driven system for a small, vetted community of condo residents.  

**Mission:**  
Ship a working MVP in 4–7 days with ruthless scope control.  

---

## MVP Ladder (Frozen Plan)
- **Day 1:** Supabase schema + seed data + RLS on bookings.  
- **Day 2:** Next.js project + API routes (`slots`, `bookings`).  
- **Day 3:** Resident UI → login, view slots, book, cancel.  
- **Day 4:** Admin UI → view bookings, manage slots, override.  
- **Day 5:** Polish + mobile responsiveness + testing.  
- **Day 6:** Deploy to Vercel + onboarding + docs.  
- **Day 7 (buffer):** Launch, feedback, bug fixes.  

**Scope Freeze (30 days):**  
- No new business rules.  
- New ideas → `future_ideas.md`.  
- Cut features before extending timeline.  

---

## Core Architecture

### Database Pattern
- **Users** → Residents (with admin roles)  
- **Parking Slots** → Physical spaces  
- **Bookings** → Time-based reservations  
- **Payments** → Optional donations/fees  

### Tech Stack
- **Database**: Supabase/PostgreSQL with RLS  
- **Backend**: Next.js API routes  
- **Frontend**: Next.js + React + Tailwind CSS  
- **Auth**: Supabase Auth (`auth.users` + `user_profiles`)  
- **Deployment**: Vercel  

### Security Model
- Manual onboarding (trusted residents only)  
- Role separation: `resident` vs `admin`  
- RLS on `bookings`, `user_profiles`  
- MVP-level security — not enterprise-grade  

---

## Schema Architecture (Frozen)
```sql
-- Links to Supabase auth.users
user_profiles (id uuid, name, unit_number, email, role, vehicle_plate)

-- Physical parking spaces
parking_slots (slot_id, slot_number, slot_type, status, description)

-- Time-based reservations
bookings (booking_id, user_id, slot_id, start_time, end_time, status, notes)

-- Optional for MVP
payments (payment_id, booking_id, amount, method, status)
```

**Booking Status Enum (Frozen):**

* `confirmed` → active, valid booking
* `cancelled` → cancelled by user/admin
* `completed` → booking ended normally

Do not invent additional states without explicit approval.

**Business Rules (Frozen 30 Days):**

1. One active booking per resident.
2. No double-booking (slot availability checked).
3. No past bookings (start\_time ≥ now with 1hr grace).
4. Admin override allowed.

---

## Canonical Component List

Copilot must use these components instead of generating new ones:

```
/components/AuthWrapper.js
/components/Navigation.js
/components/UserDashboard.js
/components/UserBookingsList.js
/components/BookingForm.js
/components/SlotGrid.js
/components/AdminDashboard.js
/components/TimeRangePicker.js
/components/BookingConfirmation.js
/components/BookingCard.js
```

Modify or extend these, don’t duplicate.

---

## Copilot Response Discipline

When suggesting code, always:

1. **Start with a short plan** (bullets).
2. **List file paths** to be created/modified.
3. **Show exact code** (full file or diffs).
4. **End with shell commands** if needed.

**Rules:**

* Never suggest schema changes. Use only the schema above.
* Return compile-ready, working code — no placeholders.
* Confirm before destructive or migration actions.
* Default to small, reversible changes.

---

## API Endpoints

```javascript
// GET /api/slots - available slots
// POST /api/bookings - create booking with validation
// GET /api/bookings/[userId] - user's bookings
// PUT /api/bookings/[id] - update/cancel booking
// GET /api/admin/bookings - admin view of all bookings
```

---

## Error Handling

* Return meaningful HTTP status codes (400, 401, 403, 404, 409, 500).
* User-friendly error messages for frontend.
* Log details server-side.

---

## Database Queries

* Use parameterized queries.
* Joins: `user_profiles` ↔ `bookings` ↔ `parking_slots`.
* Add indexes on (`user_id`, `slot_id`, `start_time`).
* **Timezone Guardrail:** Always store timestamps in UTC. Format only at render time.

---

## Development Priorities

**Must-Haves (Days 1–5):**

* User login → view slots → book slot → confirm booking.
* Admin dashboard → view all bookings → manage slots.
* No double-bookings.
* Mobile responsiveness.

**Nice-to-Haves (Post-MVP):**

* Email confirmations.
* Recurring bookings.
* Reporting.
* Payments.
* Push notifications.

---

## ADHD-Friendly Guardrails

* **30-day feature freeze.**
* New ideas → `future_ideas.md`.
* Focus on *flows*, not features.
* Test happy path daily.
* Ship MVP first, polish later.

---

## Pitfalls to Avoid

* ❌ Don’t modify `auth.users` directly.
* ❌ Don’t skip foreign key constraints.
* ❌ Don’t forget RLS policies.
* ❌ Don’t expose internal IDs unnecessarily.
* ❌ Don’t trust client validation alone.
* ❌ Don’t forget timezones in booking logic.

---

## Environment & Secrets

* Use `.env.local` only.
* Never commit secrets.
* Use `process.env.*` for all keys.
* Supabase: anon key (client), service key (server-only).

---

## Glossary

* **Resident** = condo user.
* **Admin** = management role.
* **Slot** = individual parking space.
* **Booking** = reservation record (time window).
