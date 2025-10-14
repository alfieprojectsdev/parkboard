# ParkBoard MVP Test Users

**Purpose:** Pre-configured test accounts for MVP testing and feedback
**Created:** 2025-10-14
**Status:** Ready for use

---

## Quick Test Credentials

### Primary Test User
```
Email: user1@parkboard.test
Password: test123456
Name: Test User 1
Community: LMR (Lumiere Residences)
Unit: 10A
```

### Additional Test Users (user2-user20)
```
Email Pattern: user{N}@parkboard.test (N = 1-20)
Password: test123456 (same for all)
Names: Test User {N}
Community: LMR (all in Lumiere)
Units: Vary by user (10A-29T)
```

---

## Test User Roles

### As Renter (Testing booking flow)
**Recommended:** Use `user1@parkboard.test` through `user10@parkboard.test`
- Browse available slots
- View slot details
- Create bookings
- Cancel bookings
- View "My Bookings" page

### As Owner (Testing listing flow)
**Recommended:** Use `user11@parkboard.test` through `user20@parkboard.test`
- List parking slots
- Set pricing (explicit or request quote)
- View bookings for owned slots
- Contact renters

### Dual Role (Both renter and owner)
Any test user can perform both roles - list slots AND make bookings.

---

## Test Scenarios

### Scenario 1: First-Time Renter (10 minutes)
**User:** user1@parkboard.test
**Steps:**
1. Visit `/` → See community selector
2. Click "Lumiere Residences" → See `/LMR` landing page
3. Click "Browse Slots" → See available slots
4. Click on any slot with "Instant Booking" badge
5. Fill booking form (start/end time)
6. Confirm booking → Redirected to `/LMR/bookings`
7. Verify booking appears in "Bookings I Made" section

**Expected Result:** Booking created successfully, total price auto-calculated

---

### Scenario 2: Slot Owner Listing (5 minutes)
**User:** user11@parkboard.test
**Steps:**
1. Log in → Navigate to `/LMR`
2. Click "List My Slot" in navigation
3. Fill slot form:
   - Slot Number: B-05
   - Type: Covered
   - Description: "Near elevator, well-lit"
   - **Pricing:** Choose "Set Explicit Price" → ₱50/hour
4. Submit → Redirected to `/LMR/slots`
5. Verify slot appears with "✓ Instant Booking" badge

**Expected Result:** Slot listed successfully, visible to all users

---

### Scenario 3: Request Quote Flow (8 minutes)
**User (Owner):** user12@parkboard.test
**User (Renter):** user2@parkboard.test

**Owner Steps:**
1. List slot with "Request Quote" pricing (no price entered)
2. Verify slot shows "Contact Owner" badge on browse page

**Renter Steps:**
1. Browse slots, click on "Request Quote" slot
2. Verify NO booking form shown
3. See owner contact info (name, phone)
4. Click "Call Owner" or "SMS Owner" buttons

**Expected Result:** No instant booking, contact owner to negotiate

---

### Scenario 4: Managing Bookings (6 minutes)
**User (Owner):** user11@parkboard.test (owns B-05)
**User (Renter):** user1@parkboard.test (booked B-05)

**Owner View:**
1. Navigate to `/LMR/bookings`
2. View "Bookings for My Slots" section
3. See booking for B-05
4. Verify renter contact info visible

**Renter View:**
1. Navigate to `/LMR/bookings`
2. View "Bookings I Made" section
3. See booking for B-05
4. Click "Cancel Booking" (if pending)

**Expected Result:** Both users see booking details, can contact each other

---

### Scenario 5: Multi-User Booking Conflict (5 minutes)
**User 1:** user1@parkboard.test
**User 2:** user2@parkboard.test

**Steps:**
1. User 1 books slot A-101 (Tomorrow 9AM-5PM)
2. User 2 tries to book same slot, overlapping time
3. User 2 gets error: "Slot already booked for this time"

**Expected Result:** Database prevents double-booking

---

## Test Data Setup

### Pre-Created Test Users
All 20 test users were created via:
```bash
npm run stress:data
```

This script:
- Creates users: user1-user20@parkboard.test
- All users in LMR community
- Password: test123456 (all)
- Units: 10A through 29T

### Pre-Created Test Slots (Optional)
If you need test slots already listed, run:
```sql
-- Run in Supabase SQL Editor
-- Creates 10 test slots (5 explicit pricing, 5 request quote)
\i scripts/create-test-slots.sql
```

---

## Testing Checklist

### Authentication Flow
- [ ] Login with test credentials works
- [ ] Register new account works
- [ ] Sign out redirects to login
- [ ] Navigation shows user name after login
- [ ] Login/Register buttons hidden when authenticated

### Browsing Flow (Public)
- [ ] Can browse `/LMR/slots` without login
- [ ] Slot cards show pricing correctly
- [ ] "Instant Booking" badge for explicit pricing
- [ ] "Contact Owner" badge for request quote
- [ ] Clicking slot shows detail page

### Booking Flow (Authenticated)
- [ ] Login required for booking
- [ ] Booking form validates times
- [ ] Price calculated automatically
- [ ] Booking appears in "My Bookings"
- [ ] Can cancel pending bookings
- [ ] Cannot cancel confirmed bookings

### Listing Flow (Authenticated)
- [ ] Login required for listing
- [ ] Slot creation form validates
- [ ] Explicit pricing option works
- [ ] Request quote option works
- [ ] Slot appears in browse page immediately
- [ ] Owner sees slot in bookings page

### Multi-Tenant Flow
- [ ] LMR community shows only LMR data
- [ ] Cannot access other community data
- [ ] Navigation stays within community context
- [ ] URLs include community code (`/LMR/...`)

---

## Known Limitations (MVP)

### Not Yet Implemented
- ❌ Password reset / forgot password
- ❌ Email verification
- ❌ Edit slot after creation
- ❌ Edit booking after creation
- ❌ Payment integration
- ❌ Email notifications
- ❌ SMS notifications
- ❌ Google/Facebook OAuth (commented out for MVP)

### Planned for Phase 2
See `docs/SITEMAP_AND_USER_FLOWS_20251014.md` for full feature roadmap.

---

## Troubleshooting

### Login Not Working
1. Verify test user exists in database
2. Check password is exactly: `test123456`
3. Check email is exactly: `user1@parkboard.test` (lowercase)
4. Clear browser cookies/cache
5. Check Supabase project is running

### Booking Creation Fails
1. Check slot has explicit pricing (not NULL)
2. Verify times are in future
3. Check for booking conflicts
4. Verify user is authenticated
5. Check browser console for errors

### Slot Not Appearing After Creation
1. Verify status is 'active' (not 'maintenance')
2. Check community_code is 'LMR'
3. Refresh browse page
4. Check database for slot entry

---

## For Developers

### Creating More Test Users
```bash
# Generate additional test users
npm run stress:data
```

### Resetting Test Data
```sql
-- ⚠️ WARNING: Deletes ALL test data!
DELETE FROM bookings WHERE renter_id IN (
  SELECT id FROM user_profiles WHERE email LIKE '%@parkboard.test'
);

DELETE FROM parking_slots WHERE owner_id IN (
  SELECT id FROM user_profiles WHERE email LIKE '%@parkboard.test'
);

-- Keep user accounts for reuse
```

### Viewing Test Data
```sql
-- All test users
SELECT id, name, email, unit_number, community_code
FROM user_profiles
WHERE email LIKE '%@parkboard.test'
ORDER BY email;

-- All test slots
SELECT s.slot_id, s.slot_number, s.price_per_hour, s.status, p.name as owner
FROM parking_slots s
JOIN user_profiles p ON s.owner_id = p.id
WHERE p.email LIKE '%@parkboard.test'
ORDER BY s.created_at DESC;

-- All test bookings
SELECT b.booking_id, b.status, b.total_price,
       p.name as renter, s.slot_number
FROM bookings b
JOIN user_profiles p ON b.renter_id = p.id
JOIN parking_slots s ON b.slot_id = s.slot_id
WHERE p.email LIKE '%@parkboard.test'
ORDER BY b.created_at DESC;
```

---

## Feedback Collection

### What to Test
1. **Usability:** Is the flow intuitive?
2. **Performance:** Are pages loading fast?
3. **Bugs:** Any errors or unexpected behavior?
4. **Features:** What's missing that you need?
5. **Design:** Is the UI clear and professional?

### How to Report Issues
1. Note the test user you used
2. Describe what you tried to do
3. Describe what happened vs. expected
4. Include any error messages
5. Note browser and device used

---

**Last Updated:** 2025-10-14
**Test Users Status:** ✅ Ready for MVP testing
**Next Steps:** Deploy to staging → Gather feedback → Iterate
