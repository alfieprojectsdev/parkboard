# ParkBoard MVP Development Plan (4-7 Days)

## Foundation: Hotel Booking Pattern (Frozen Schema)
- **Users** → Residents
- **Parking Slots** → Physical spaces  
- **Bookings** → Reservations
- **Admins** → Management oversight

---

## Day 1: Database Setup & Core Schema

### Morning (2-3 hours)
- [ ] Set up Supabase project
- [ ] Run `schema_v1.sql` in Supabase SQL Editor
- [ ] Verify tables created: `users`, `parking_slots`, `bookings`, `payments`, `admins`
- [ ] Test seed data insertion
- [ ] Verify foreign key relationships work

### Afternoon (2-3 hours)
- [ ] Create basic auth policies (MVP-safe level)
- [ ] Enable RLS on `bookings` table only: `user_id = auth.uid()`
- [ ] Test auth flow in Supabase dashboard
- [ ] Document database connection details

**Deliverable**: Working database with test data

---

## Day 2: Backend API Layer

### Morning (3-4 hours)
- [ ] Set up Next.js project with Supabase client
- [ ] Create API routes:
  - `GET /api/slots` - available slots
  - `POST /api/bookings` - create booking
  - `GET /api/bookings/[userId]` - user's bookings
- [ ] Test API endpoints with Postman/Thunder Client

### Afternoon (2-3 hours)
- [ ] Add basic validation:
  - Slot availability check
  - Time conflict prevention
  - One active booking per user rule
- [ ] Error handling for common cases
- [ ] Test edge cases (double booking, invalid times)

**Deliverable**: Functional REST API

---

## Day 3: Core Frontend (Resident View)

### Morning (3-4 hours)
- [ ] Create basic auth pages (login/register)
- [ ] Dashboard layout with available slots
- [ ] Slot selection interface
- [ ] Basic booking form (slot + time selection)

### Afternoon (3-4 hours)
- [ ] Connect frontend to API endpoints
- [ ] Display user's current bookings
- [ ] Cancel booking functionality
- [ ] Basic success/error messaging

**Deliverable**: Working resident interface

---

## Day 4: Admin Interface & Business Logic

### Morning (3-4 hours)
- [ ] Admin dashboard layout
- [ ] View all bookings (today/week/month)
- [ ] Slot management (mark maintenance/available)
- [ ] User management basics

### Afternoon (2-3 hours)
- [ ] Admin booking overrides
- [ ] Basic reporting (booking counts, popular slots)
- [ ] Slot status management
- [ ] Testing admin workflows

**Deliverable**: Complete admin functionality

---

## Day 5: Polish & Testing

### Morning (3-4 hours)
- [ ] UI/UX improvements
- [ ] Mobile responsiveness
- [ ] Loading states and error handling
- [ ] Form validation feedback

### Afternoon (2-3 hours)
- [ ] End-to-end testing:
  - Complete booking flow
  - Admin management flow
  - Cancel/reschedule flow
- [ ] Bug fixes and edge cases
- [ ] Performance optimization

**Deliverable**: Polished, tested MVP

---

## Day 6: Deployment & User Onboarding

### Morning (2-3 hours)
- [ ] Deploy to Vercel/Netlify
- [ ] Configure production environment variables
- [ ] Test production deployment
- [ ] Set up domain (if needed)

### Afternoon (2-3 hours)
- [ ] Create user onboarding flow
- [ ] Write simple user guide/FAQ
- [ ] Set up admin account
- [ ] Add initial real users manually

**Deliverable**: Live, deployed application

---

## Day 7: Launch & Feedback (Optional Buffer)

### Morning (2-3 hours)
- [ ] Final testing with real users
- [ ] Monitor for immediate issues
- [ ] Quick bug fixes
- [ ] User support preparation

### Afternoon (2-3 hours)
- [ ] Gather initial feedback
- [ ] Document known limitations
- [ ] Plan next iteration features
- [ ] Backup and monitoring setup

**Deliverable**: Launched MVP with feedback loop

---

## Technical Stack (Frozen for MVP)

### Database
- **Supabase/PostgreSQL**
- Schema: 5 tables (users, parking_slots, bookings, payments, admins)
- Basic RLS on bookings only

### Backend
- **Next.js API routes**
- Supabase client integration
- Basic validation and business rules

### Frontend
- **Next.js + React**
- Tailwind CSS for styling
- Supabase auth integration

### Security (MVP Level)
- Manual user vetting (like Lumiere)
- Basic role separation (resident/admin)
- "Good enough" for trusted user group

---

## Key Success Criteria

### Must Have (Days 1-5)
- [ ] Users can log in and see available slots
- [ ] Users can book and cancel slots
- [ ] Admins can manage slots and view all bookings
- [ ] No double-booking conflicts
- [ ] Basic mobile usability

### Nice to Have (Days 6-7)
- [ ] Email confirmations
- [ ] Recurring bookings
- [ ] Advanced reporting
- [ ] Payment integration

---

## Risk Mitigation

### Scope Creep Prevention
- **Frozen business rules for 30 days**
- New ideas go to `future_ideas.md`
- Focus on core booking workflow only

### Technical Debt Management
- Keep schema simple but extensible
- Document all shortcuts taken
- Plan refactoring after MVP feedback

### Time Management
- Max 6-8 hours coding per day
- Daily check-ins on progress
- Cut features before extending timeline

---

## Daily Checkpoint Questions

1. **Can I demonstrate the core user flow?**
2. **What's the biggest remaining risk?**
3. **Am I solving the actual problem or over-engineering?**
4. **Is this ready for the vetted user group to try?**