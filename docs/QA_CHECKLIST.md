# ✅ ParkBoard MVP - Page-based QA Checklist

### **1. Authentication**

🔗 `/auth`

* [ ] Page renders login/signup form (AuthWrapper.js).
* [ ] New user can sign up.
* [ ] Existing user can log in.
* [ ] Session persists across refresh.
* [ ] Logout clears session.

---

### **2. Resident (Renter)**

🔗 `/slots`

* [ ] SlotGrid shows available slots.
* [ ] TimeRangePicker allows selecting date/time.
* [ ] BookingForm submits booking.
* [ ] BookingConfirmation page/message displays after booking.

🔗 `/bookings`

* [ ] List of active bookings appears.
* [ ] Can cancel a booking → slot becomes available again.
* [ ] Past bookings visible under “history.”

🔗 `/test`

* [ ] Supabase test fetch shows 5 slots with IDs + descriptions.
* [ ] No console errors (e.g. React keys).

---

### **3. Slot Owner**

🔗 `/owner`

* [ ] Can add a new slot (slot number + description).
* [ ] Can edit slot info.
* [ ] Can toggle slot status: **Available / Maintenance**.
* [ ] Only owner’s slots are visible.

---

### **4. HOA / Admin**

🔗 `/admin`

* [ ] AdminDashboard loads with two tabs: Slots + Bookings.
* [ ] Slots list is visible (all slots, read-only).
* [ ] Bookings list is visible (all bookings, read-only).
* [ ] No edit actions exposed (read-only confirmed).

---

### **5. General Checks**

* [ ] Navigation (Navigation.js) links work across all pages.
* [ ] Mobile layout renders correctly (small viewport).
* [ ] Errors are shown gracefully (Supabase error → red box, no crash).
* [ ] Console free of warnings/errors.

---

# 🔄 ParkBoard MVP — User Flow Test Checklist

---

## **Resident (Renter) Flow**

**Goal: Book and manage a parking slot**

1. **Sign up & login**

   * [ ] Create a new resident account.
   * [ ] Verify session persists after refresh.

2. **Book a slot**

   * [ ] Go to `/slots`.
   * [ ] See available slots (SlotGrid).
   * [ ] Pick date/time (TimeRangePicker).
   * [ ] Submit booking (BookingForm).
   * [ ] See confirmation (BookingConfirmation).

3. **Cancel a booking**

   * [ ] Go to `/bookings`.
   * [ ] Cancel upcoming booking.
   * [ ] Slot reappears in `/slots` as available.

4. **View booking history**

   * [ ] Past bookings are listed in `/bookings`.

---

## **Slot Owner Flow**

**Goal: Manage owned slots**

1. **Login**

   * [ ] Sign in as slot owner account.

2. **Manage slots**

   * [ ] Go to `/owner`.
   * [ ] Add a slot (slot number + description).
   * [ ] Edit slot info.
   * [ ] Toggle slot availability (Available / Maintenance).

3. **Validate visibility**

   * [ ] Only owner’s slots are shown in `/owner`.
   * [ ] Renter accounts can see slot availability changes on `/slots`.

---

## **Admin Flow**

**Goal: Monitor overall activity**

1. **Login**

   * [ ] Sign in as admin account.

2. **Check slots**

   * [ ] Go to `/admin`.
   * [ ] See full list of slots (read-only).

3. **Check bookings**

   * [ ] Switch to “Bookings” tab.
   * [ ] All resident bookings visible (read-only).

4. **Verify permissions**

   * [ ] No edit actions exposed to admin.

---

## **Cross-Flow Tests**

* [ ] Navigation links work across all flows.
* [ ] Errors handled gracefully (bad form input → user-friendly error).
* [ ] No console warnings/errors during flows.
* [ ] Mobile/responsive layout is usable.