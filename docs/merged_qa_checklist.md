# 🚗 ParkBoard MVP - Unified QA Checklist

This document consolidates **manual render checks** and **user flow tests** for the ParkBoard parking management system. Use it after major changes, before commits, and especially before pushing to production.

---

## 🔍 1. Manual URL Render Check

Check each route in your browser. Ensure it loads without errors, renders correctly, and has no broken links or styling issues.

| URL | Expected Behavior | Key Components |
|-----|-------------------|----------------|
| `/` | Landing/Home page with community branding | `app/page.tsx`, `components/*` |
| `/auth` | Login/signup form (AuthWrapper) | `components/AuthWrapper.js` |
| `/slots` | SlotGrid shows available slots with TimeRangePicker | `components/SlotGrid.js`, `components/TimeRangePicker.js` |
| `/bookings` | User's active bookings list and history | `components/UserBookingsList.js` |
| `/bookings/new` | New booking form with slot selection | `components/BookingForm.js` |
| `/owner` | Slot owner management panel | `components/OwnerDashboard.js` |
| `/admin` | Admin dashboard with slots and bookings tabs | `components/AdminDashboard.js` |
| `/test` | Supabase connection test page | Test utilities |

---

## ✅ 2. Authentication Flow Tests

**Goal: Verify user authentication system**

### Sign Up & Login
- [ ] Navigate to `/auth` - page renders login/signup form
- [ ] Create new user account with valid email/password
- [ ] Verify email validation works (invalid format rejected)
- [ ] Existing user can log in successfully
- [ ] Session persists across browser refresh
- [ ] Logout clears session and redirects properly
- [ ] Failed login shows appropriate error message

---

## 🅿️ 3. Resident (Renter) Flow Tests

**Goal: Book and manage parking slots**

### Slot Booking Process
- [ ] Go to `/slots` - SlotGrid displays available slots
- [ ] TimeRangePicker allows date/time selection
- [ ] BookingForm accepts valid slot selection
- [ ] BookingConfirmation appears after successful booking
- [ ] Invalid bookings rejected (past dates, conflicts, unavailable slots)
- [ ] Real-time slot availability updates correctly

### Booking Management
- [ ] Go to `/bookings` - list of active bookings appears
- [ ] Can cancel upcoming booking
- [ ] Cancelled slot becomes available again in `/slots`
- [ ] Past bookings visible in history section
- [ ] Booking status updates correctly (confirmed, cancelled, completed)

---

## 🏢 4. Slot Owner Flow Tests

**Goal: Manage owned parking slots**

### Slot Management
- [ ] Go to `/owner` - owner dashboard loads
- [ ] Can add new slot (slot number + description)
- [ ] Can edit existing slot information
- [ ] Can toggle slot status (Available/Maintenance/Reserved)
- [ ] Only owner's slots are visible (privacy check)
- [ ] Changes reflect immediately in renter's `/slots` view

### Ownership Validation
- [ ] Non-owners cannot access `/owner` page
- [ ] Slot modifications only affect owner's slots
- [ ] Slot availability changes visible to all users

---

## 👨‍💼 5. Admin Flow Tests

**Goal: Monitor and oversee system activity**

### Admin Dashboard
- [ ] Log in with admin account
- [ ] Go to `/admin` - AdminDashboard loads successfully
- [ ] Two tabs visible: Slots and Bookings
- [ ] Slots tab shows all slots (read-only)
- [ ] Bookings tab shows all user bookings (read-only)
- [ ] Admin has view-only permissions (no edit actions)
- [ ] Can see system-wide statistics and activity

### Admin Permissions
- [ ] Admin can view all users' data
- [ ] Admin cannot directly modify bookings (read-only confirmed)
- [ ] Admin role restrictions properly enforced

---

## 🔧 6. Technical Infrastructure Tests

### Database & API
- [ ] Go to `/test` - Supabase test shows 5 slots with IDs + descriptions
- [ ] No console errors in browser developer tools
- [ ] API endpoints respond correctly
- [ ] Row Level Security (RLS) policies enforced
- [ ] Database constraints prevent invalid data

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Invalid form submissions show user-friendly messages
- [ ] Database errors don't crash the application
- [ ] 404 pages render properly for invalid routes

---

## 📱 7. Cross-Platform & UI Tests

### Responsive Design
- [ ] Navigation links work across all pages
- [ ] Mobile layout renders correctly (small viewport)
- [ ] Touch interactions work on mobile devices
- [ ] Desktop layout maintains functionality

### User Experience
- [ ] No console warnings/errors during normal usage
- [ ] Loading states display appropriately
- [ ] Form validation provides clear feedback
- [ ] Success/error messages are user-friendly
- [ ] Consistent styling across all pages

---

## 🔄 8. End-to-End Integration Tests

### Complete User Journey
- [ ] New user registration → profile setup → first booking → cancellation
- [ ] Slot owner creates slot → renter books it → owner sees booking activity
- [ ] Admin monitors system activity across multiple users
- [ ] Multiple concurrent bookings don't create conflicts
- [ ] Time-based booking constraints work correctly

### Data Consistency
- [ ] Slot availability updates in real-time across users
- [ ] Booking conflicts prevented at database level
- [ ] User permissions consistently enforced
- [ ] Session management works across browser tabs

---

## ⚡ Quick Testing Notes

### Before Each Test Session
- [ ] Run `npm run dev` locally
- [ ] Check browser console for JavaScript errors
- [ ] Monitor server logs for backend errors
- [ ] Clear browser cache if testing auth changes

### Common Issues to Watch For
- [ ] React key warnings in console
- [ ] Supabase connection errors
- [ ] Tailwind CSS styling breaks
- [ ] Component import/export issues
- [ ] Time zone handling in bookings
- [ ] Concurrent booking race conditions

### Test Data Requirements
- [ ] At least 3 test users (resident, owner, admin)
- [ ] Multiple parking slots with different types
- [ ] Sample bookings across different time periods
- [ ] Various slot statuses (available, maintenance, reserved)

---

## 🎯 Success Criteria

**MVP is ready for production when:**
- [ ] All URL renders work without errors
- [ ] Core user flows complete successfully
- [ ] Security policies prevent unauthorized access
- [ ] Mobile and desktop interfaces are functional
- [ ] Error handling provides good user experience
- [ ] Database integrity is maintained under normal usage

**Post-production monitoring:**
- [ ] User registration and login rates
- [ ] Booking success/failure rates  
- [ ] System performance under load
- [ ] User feedback and support requests