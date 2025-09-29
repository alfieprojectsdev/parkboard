# 🚗 ParkBoard MVP - Complete QA Checklist v2.0

This updated checklist reflects the current implementation including slot ownership, enhanced error handling, and all recent improvements.

---

## 📍 1. URL Render & Component Check

Test each route loads without errors and displays correct components:

| URL | Expected Behavior | Components to Verify | Status |
|-----|-------------------|---------------------|---------|
| `/` | Landing page with CTA buttons | Hero section, features grid, quick links | ⬜ |
| `/login` | Login/signup form with profile creation | Email/password fields, signup includes name/unit | ⬜ |
| `/dashboard` | User dashboard with tabs | MySlots (if owned), Bookings list, New booking | ⬜ |
| `/bookings` | User's bookings list | Active/History tabs, cancel buttons | ⬜ |
| `/bookings/new` | Standalone booking page | TimeRangePicker, SlotGrid, confirmation | ⬜ |
| `/admin` | Admin overview dashboard | Stats cards, recent bookings, quick actions | ⬜ |
| `/admin/slots` | Slot management with ownership | Add/edit forms with owner dropdown | ⬜ |
| `/admin/users` | User management | Role assignment, search, user list | ⬜ |
| `/about` | About page | Mission, features, contact info | ⬜ |

---

## ✅ 2. Authentication & Profile Tests

### Sign Up Flow
- [ ] Navigate to `/login` - form renders correctly
- [ ] Toggle between Login/Signup modes works
- [ ] Signup requires: email, password, name, unit number
- [ ] Optional fields: phone, vehicle plate
- [ ] Password confirmation matches validation
- [ ] Successful signup creates auth user AND profile
- [ ] Error shows if profile creation fails
- [ ] After signup, auto-redirects to dashboard

### Login Flow  
- [ ] Existing users can log in with email/password
- [ ] Invalid credentials show error message
- [ ] Session persists across page refreshes
- [ ] Session expires after inactivity (5 min check)
- [ ] Logout clears session and redirects to `/login`

### Error Boundary
- [ ] Component crashes are caught gracefully
- [ ] Error boundary shows refresh/retry options
- [ ] Development mode shows error details

---

## 🅿️ 3. Resident Booking Flow Tests

### Slot Booking Creation
- [ ] Dashboard shows "New Booking" tab
- [ ] TimeRangePicker defaults to today's date
- [ ] Duration options: 1, 2, 4, 8, 12, 24 hours
- [ ] **Validation Rules Enforced:**
  - [ ] Minimum 1 hour duration
  - [ ] Maximum 24 hour duration
  - [ ] Maximum 30 days advance booking
  - [ ] Cannot book in the past
- [ ] SlotGrid shows after time selection
- [ ] **Slot Display Features:**
  - [ ] Legend shows: Your Slots, Shared, Reserved, Booked
  - [ ] Owned slots marked with "Your Slot" badge
  - [ ] Reserved slots show "Reserved" (cannot book)
  - [ ] Booked slots show "Booked" (cannot book)
  - [ ] Available shared slots can be selected
- [ ] Selected slot highlights in blue
- [ ] Confirm booking button works
- [ ] Success message shows with redirect timer
- [ ] Booking appears in "My Bookings" immediately

### MySlots Component (Owned Slots)
- [ ] If user owns slots, they display at top of dashboard
- [ ] Shows slot number, type, description
- [ ] Status badge (available/maintenance)
- [ ] Blue gradient background for prominence
- [ ] Info message about booking owned slots

### Booking Management
- [ ] "My Bookings" tab shows active bookings
- [ ] Toggle between Active/History views
- [ ] Each booking card shows:
  - [ ] Slot number and type icon
  - [ ] Date and time range
  - [ ] Status badge
  - [ ] Cancel button (if active)
- [ ] Cancel requires confirmation
- [ ] Cannot cancel past bookings (1 hour grace)
- [ ] Cancelled booking moves to History
- [ ] Refresh button updates list

---

## 🏢 4. Slot Ownership Tests

### Mixed Slot Environment
- [ ] Database has mix of owned and shared slots
- [ ] Owned slots show owner name in admin view
- [ ] Shared slots show "Shared" in admin view
- [ ] Users can book their own slots anytime available
- [ ] Users can book shared/visitor slots
- [ ] Users CANNOT book slots owned by others
- [ ] Error message: "This slot is reserved for another resident"

### Visual Indicators
- [ ] Green background for user's owned slots
- [ ] White background for shared slots
- [ ] Red background for slots owned by others
- [ ] Gray background for booked slots
- [ ] Blue ring for selected slot

---

## 👨‍💼 5. Admin Flow Tests

### Admin Dashboard (`/admin`)
- [ ] Only accessible by admin role users
- [ ] Stats cards show:
  - [ ] Total Users count
  - [ ] Total Slots count
  - [ ] Active Bookings count
  - [ ] Today's Bookings count
- [ ] Quick Actions links work:
  - [ ] Manage Parking Slots → `/admin/slots`
  - [ ] Manage Users → `/admin/users`
  - [ ] View All Bookings → `/bookings`
- [ ] Recent Bookings list shows latest 5
- [ ] Refresh Data button updates stats

### Slot Management (`/admin/slots`)
- [ ] "Add New Slot" button opens form
- [ ] **Add Slot Form includes:**
  - [ ] Slot Number (required, unique)
  - [ ] Slot Type (covered/uncovered/visitor)
  - [ ] Status (available/maintenance/reserved)
  - [ ] Owner dropdown (lists all users or "Shared")
  - [ ] Description (optional)
- [ ] Edit button populates form with existing data
- [ ] Update saves changes immediately
- [ ] Delete requires confirmation
- [ ] **Statistics show:**
  - [ ] Total Slots
  - [ ] Owned Slots count
  - [ ] Shared Slots count
  - [ ] Available count
- [ ] Table sortable by slot number

### User Management (`/admin/users`)
- [ ] Search box filters users in real-time
- [ ] User table shows all registered users
- [ ] Each row displays:
  - [ ] Name, Email, Unit, Phone, Vehicle
  - [ ] Role badge (resident/admin)
  - [ ] Role dropdown for changes
- [ ] Cannot change own admin role (disabled)
- [ ] Role changes take effect immediately
- [ ] Statistics show resident vs admin counts

---

## 🔧 6. Technical Validation Tests

### Database Integrity
- [ ] Booking overlaps prevented at DB level
- [ ] Foreign key constraints enforced
- [ ] RLS policies prevent unauthorized access
- [ ] Cascading deletes work properly
- [ ] Timestamps auto-update on changes

### API Error Handling
- [ ] Network errors show user-friendly messages
- [ ] 400 errors explain validation issues
- [ ] 403 errors for ownership violations
- [ ] 404 errors for missing resources
- [ ] 500 errors suggest retry
- [ ] JSON parsing errors handled

### Performance & Loading States
- [ ] Loading spinners appear during data fetch
- [ ] Skeleton loaders for slow connections
- [ ] No UI flashing on route changes
- [ ] Forms disable during submission
- [ ] Optimistic updates where appropriate

---

## 📱 7. Responsive Design Tests

### Mobile (< 640px)
- [ ] Navigation hamburger menu works
- [ ] Slot grid adjusts to 2 columns
- [ ] Forms stack vertically
- [ ] Tables become scrollable
- [ ] Modals fit screen properly
- [ ] Touch targets minimum 44px

### Tablet (640px - 1024px)
- [ ] Navigation shows partial items
- [ ] Slot grid shows 3 columns
- [ ] Dashboard layout adjusts
- [ ] Tables remain readable

### Desktop (> 1024px)
- [ ] Full navigation visible
- [ ] Slot grid shows 4 columns
- [ ] Side-by-side layouts work
- [ ] Hover effects function

---

## 🔄 8. End-to-End User Journeys

### New User Complete Flow
- [ ] Land on homepage → Click "Sign In"
- [ ] Switch to signup → Enter all details
- [ ] Confirm email → Create profile
- [ ] Land on dashboard → See welcome message
- [ ] Go to New Booking → Select tomorrow 2pm-6pm
- [ ] Choose available slot → Confirm booking
- [ ] See confirmation → Check My Bookings
- [ ] Cancel booking → Verify cancellation

### Slot Owner Journey
- [ ] Admin assigns slot A-001 to user
- [ ] User sees A-001 in MySlots section
- [ ] User books own slot for next week
- [ ] Booking appears as confirmed
- [ ] Other users cannot book A-001
- [ ] User can book it again after cancelling

### Admin Monitoring Flow
- [ ] Admin logs in → Sees admin badge
- [ ] Reviews dashboard stats
- [ ] Checks recent bookings activity
- [ ] Adds new slot B-010 as shared
- [ ] Assigns C-005 to specific resident
- [ ] Changes user role to admin
- [ ] Verifies changes reflected

---

## ⚡ Common Issues Checklist

### Before Testing
- [ ] Clear browser cache and cookies
- [ ] Check console for errors (should be none)
- [ ] Verify `.env.local` has all keys
- [ ] Database migrations applied
- [ ] Seed data loaded if needed

### Known Issues to Verify Fixed
- [ ] ✅ Tailwind classes rendering properly
- [ ] ✅ Slot ownership prevents conflicts
- [ ] ✅ Booking validation enforced
- [ ] ✅ Profile creation on signup
- [ ] ✅ Session management stable
- [ ] ✅ Error messages user-friendly
- [ ] ✅ Mobile navigation functional

### Edge Cases to Test
- [ ] Book slot at midnight crossing days
- [ ] Multiple users booking simultaneously
- [ ] Network disconnect during booking
- [ ] Session expire during form fill
- [ ] Admin deleting slot with active bookings
- [ ] Timezone handling for international users

---

## 🎯 Definition of Done

**MVP is production-ready when:**

### Critical Requirements (Must Pass)
- [ ] All authentication flows work
- [ ] Users can book available slots
- [ ] Ownership rules enforced correctly  
- [ ] No booking conflicts possible
- [ ] Admin can manage system
- [ ] Mobile responsive design works
- [ ] No console errors in production build

### Quality Standards
- [ ] Page load time < 3 seconds
- [ ] Time to Interactive < 5 seconds
- [ ] Lighthouse score > 80
- [ ] Zero accessibility violations
- [ ] All forms have validation
- [ ] All errors have recovery paths