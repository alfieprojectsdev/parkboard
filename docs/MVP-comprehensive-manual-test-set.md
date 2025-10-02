## ✅ **Comprehensive Manual Test Set for MVP**

Here's a structured test plan organized by priority:

### **1. CRITICAL PATH TESTS (Must Pass)**

#### **A. Authentication & Authorization**
- [ ] **Register new user** with all required fields
- [ ] **Login with valid credentials**
- [ ] **Login with invalid credentials** (should fail gracefully)
- [ ] **Logout** and verify session cleared
- [ ] **Access protected routes while logged out** → should redirect to login
- [ ] **Admin user can access `/admin` route**
- [ ] **Regular user CANNOT access `/admin` route** → should show "Access Denied"
- [ ] **Check browser console for auth token** after login (should exist)
- [ ] **Refresh page while logged in** → should stay logged in

#### **B. Booking Flow (Happy Path)**
- [ ] **View available slots** on `/slots` page
- [ ] **Select date/time range** that has no conflicts
- [ ] **Submit booking request**
- [ ] **Verify booking appears in "My Bookings"** with correct details
- [ ] **Check that booked slot shows as unavailable** for overlapping times
- [ ] **Cancel an active booking** → verify status changes to "cancelled"
- [ ] **Attempt to cancel same booking twice** → should fail with error message

#### **C. Admin Dashboard Functionality**
- [ ] **Login as admin user**
- [ ] **Navigate to `/admin` dashboard**
- [ ] **View "All Bookings" tab** → should show bookings from ALL users (not just admin's)
- [ ] **View "All Slots" tab** → should show complete parking inventory
- [ ] **View "All Users" tab** → should show user directory
- [ ] **Verify admin CANNOT edit/delete bookings directly** (read-only for MVP)

---

### **2. EDGE CASES & VALIDATION (Important)**

#### **D. Booking Conflicts & Business Rules**
- [ ] **Attempt to book already-occupied slot** → should show error
- [ ] **Book slot 1 hour in the future** → should succeed
- [ ] **Attempt to book slot in the past** → should fail validation
- [ ] **Book slot for exactly minimum duration** (e.g., 30 min if that's your rule)
- [ ] **Book slot for maximum duration** (e.g., 24 hours)
- [ ] **Attempt to book beyond maximum duration** → should fail
- [ ] **Check overlapping bookings** (e.g., Slot A: 8AM-10AM, try booking 9AM-11AM → fail)
- [ ] **Back-to-back bookings** (e.g., Slot A: 8AM-10AM, then 10AM-12PM → both should succeed)

#### **E. Slot Management (If Implemented)**
- [ ] **Admin adds new parking slot** → verify it appears in slot list
- [ ] **Admin marks slot as "Maintenance"** → verify unavailable to users
- [ ] **Admin marks slot as "Available"** again → verify bookable
- [ ] **Admin edits slot details** (number, description) → changes persist

#### **F. Form Validation**
- [ ] **Submit booking with missing required field** → error shown
- [ ] **Submit registration with existing email** → error shown
- [ ] **Submit registration with weak password** → error shown (if rule exists)
- [ ] **Enter invalid email format** → validation error
- [ ] **Enter invalid phone number format** → validation error (if validated)

---

### **3. USER EXPERIENCE TESTS**

#### **G. Navigation & UI**
- [ ] **Click all navbar links** → each route loads correctly
- [ ] **Test mobile layout** → responsive design works on 375px width
- [ ] **Test tablet layout** → works on 768px width
- [ ] **Test desktop layout** → works on 1920px width
- [ ] **Check for console errors** during normal navigation
- [ ] **Verify loading states appear** during API calls
- [ ] **Verify success messages** show after actions (green toast/banner)
- [ ] **Verify error messages** show for failures (red toast/banner)

#### **H. Data Consistency**
- [ ] **Create booking in one browser tab** → verify it appears in another tab after refresh
- [ ] **Cancel booking** → verify it updates across all views
- [ ] **Check database directly** (Supabase dashboard) → data matches UI
- [ ] **Verify timestamps** are in correct timezone (UTC in DB, local in UI)

---

### **4. SECURITY TESTS**

#### **I. Access Control**
- [ ] **Regular user tries to access admin dashboard** → blocked
- [ ] **Logged-out user tries to access `/bookings`** → redirected to login
- [ ] **User A tries to cancel User B's booking** via API tampering → blocked
- [ ] **User tries to book slot belonging to another building** (if multi-building) → blocked
- [ ] **Check for exposed secrets** in browser network tab → no API keys visible

#### **J. SQL Injection & XSS Prevention**
- [ ] **Enter `<script>alert('XSS')</script>` in slot description** → sanitized
- [ ] **Enter SQL like `' OR '1'='1` in search fields** → treated as literal string
- [ ] **Upload malicious file** (if file upload exists) → rejected

---

### **5. PERFORMANCE & RELIABILITY**

#### **K. Error Handling**
- [ ] **Disconnect internet** → graceful offline message
- [ ] **API timeout** (simulate slow connection) → loading state doesn't hang forever
- [ ] **Database constraint violation** (e.g., duplicate booking) → user-friendly error
- [ ] **Invalid date range** (end before start) → validation error

#### **L. Stress Testing**
- [ ] **Create 20+ bookings** → pagination works correctly
- [ ] **Rapid-fire clicks on "Book" button** → no duplicate bookings created
- [ ] **Multiple users booking same slot simultaneously** → only one succeeds
