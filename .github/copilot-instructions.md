# GitHub Copilot Instructions for ParkBoard

## Project Overview
ParkBoard is a condo parking booking web application built from first principles. This is an MVP designed to replace manual coordination systems (like Viber group chats) with a proper database-driven booking system for a small, vetted community of condo residents.

## Core Architecture Decisions

### Database Pattern: Hotel Booking System
- **Users** → Residents (with admin roles)  
- **Parking Slots** → Bookable spaces
- **Bookings** → Time-based reservations
- **Payments** → Optional donations/fees

### Tech Stack (Frozen for MVP)
- **Database**: Supabase/PostgreSQL with Row Level Security
- **Backend**: Next.js API routes  
- **Frontend**: Next.js + React + Tailwind CSS
- **Auth**: Supabase Auth (`auth.users` + `user_profiles` pattern)
- **Deployment**: Vercel

### Security Model: "Vetted User Group"
- Manual user onboarding (like existing Viber group)
- MVP-level security, not enterprise-grade
- Basic role separation: `resident` vs `admin`
- RLS enabled only on sensitive tables (`bookings`, `user_profiles`)

## Schema Architecture

### Core Tables
```sql
-- Links to Supabase auth.users
user_profiles (id uuid, name, unit_number, email, role, vehicle_plate)

-- Physical parking spaces  
parking_slots (slot_id, slot_number, slot_type, status, description)

-- Time-based reservations
bookings (booking_id, user_id, slot_id, start_time, end_time, status, notes)

-- Optional for MVP
payments (payment_id, booking_id, amount, payment_method, status)
```

### Business Rules (Frozen for 30 Days)
1. **One active booking per resident** at a time
2. **No double-booking** - slot availability checked against time ranges
3. **No past bookings** - start_time must be >= now (with 1hr grace period)
4. **Admin override** exists for emergency management

## Code Style & Patterns

### API Endpoints Structure
```javascript
// GET /api/slots - show available slots for time range
// POST /api/bookings - create new booking with validation
// GET /api/bookings/[userId] - user's current bookings
// PUT /api/bookings/[id] - update/cancel booking
// GET /api/admin/bookings - admin view of all bookings
```

### Error Handling
- Return meaningful HTTP status codes (400, 401, 403, 404, 409, 500)
- Include user-friendly error messages for frontend display
- Log detailed errors server-side for debugging

### Database Queries
- Always use parameterized queries (prevent SQL injection)
- Include proper joins between `user_profiles`, `bookings`, and `parking_slots`
- Use indexes on common query patterns (`user_id`, `slot_id`, `start_time`)

### Security Patterns
- Check `auth.uid()` matches `user_id` for user operations
- Verify admin role before allowing management operations
- Use RLS policies as backup, not primary security

## Development Priorities

### MVP Must-Haves (Days 1-5)
1. User login → view available slots → book slot → confirm booking
2. Admin dashboard → view all bookings → manage slot status
3. Basic conflict prevention (no double bookings)
4. Mobile-responsive UI

### Nice-to-Haves (Post-MVP)
- Email confirmations
- Recurring bookings  
- Advanced reporting
- Payment integration
- Push notifications

## ADHD-Friendly Development Rules

### Scope Control
- **30-day feature freeze** - no new requirements during MVP development
- New ideas go in `future_ideas.md`, not current sprint
- Cut features before extending timeline

### Code Organization
```
/db/
  schema_v2.sql
  rls_policies.sql
  seed_data.sql
  wipe_and_reset.sql
/src/lib/
  supabase.js
/pages/api/
  slots.js
  bookings/
/components/
  BookingForm.js
  SlotGrid.js
  AdminDashboard.js
```

### Daily Progress Tracking
- Focus on complete user flows, not individual features
- Test the happy path every day
- Ship MVP in 4-7 days maximum

## Common Pitfalls to Avoid

### Database
- Don't modify `auth.users` directly (use `user_profiles`)
- Don't forget foreign key constraints between tables
- Don't skip RLS policies on sensitive data

### API Design
- Don't expose internal IDs to frontend unnecessarily
- Don't trust client-side validation alone
- Don't forget to handle timezone edge cases

### UI/UX
- Keep it simple - this replaces a Viber chat, not Airbnb
- Mobile-first design (residents book on phones)
- Clear error messages for booking conflicts

## Context for AI Assistance

### When suggesting code:
- Assume Supabase client is already configured
- Use the established schema (don't suggest schema changes)
- Follow the Hotel Booking transaction pattern
- Keep security at "vetted group" level, not enterprise

### When solving problems:
- Prioritize MVP delivery over perfect architecture
- Suggest pragmatic solutions that work with small user base
- Remember this replaces manual coordination, not complex business logic

### When debugging:
- Check foreign key relationships first
- Verify RLS policies aren't blocking legitimate operations
- Look for timezone/timestamp issues in booking logic