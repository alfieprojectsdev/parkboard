# 🚗 ParkBoard MVP – QA Master Checklist

This document consolidates **manual render checks** and **user flow tests**.
Use it after major changes, before commits, and especially before pushing to production.

---

## 🔍 1. Manual URL Render Check

Check each route in your browser. Ensure it loads without errors, renders correctly, and has no broken links or styling issues.

| URL                   | Expected Behavior                                   | Linked Source Files                                             |
| --------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `/`                   | Landing / Home page renders with community branding | `app/page.tsx`, `components/*`                                  |
| `/about`              | About page content is visible                       | `app/about/page.tsx`                                            |
| `/login`              | Login form displays                                 | `app/login/page.tsx`, `components/forms/LoginForm.tsx`          |
| `/register`           | Registration form displays                          | `app/register/page.tsx`, `components/forms/RegisterForm.tsx`    |
| `/dashboard`          | User dashboard loads after login                    | `app/dashboard/page.tsx`, `components/dashboard/*`              |
| `/bookings`           | Booking overview visible                            | `app/bookings/page.tsx`, `components/bookings/*`                |
| `/bookings/new`       | New booking form works                              | `app/bookings/new/page.tsx`, `components/forms/BookingForm.tsx` |
| `/donations`          | Donations summary visible                           | `app/donations/page.tsx`, `components/donations/*`              |
| `/admin`              | Admin panel loads (only for admin users)            | `app/admin/page.tsx`, `components/admin/*`                      |
| `/tests` (if enabled) | Test page(s) render properly                        | `tests/`                                                        |

---

## ✅ 2. User Flow Test Checklist

Simulate end-to-end actions. Each flow should work without console errors, DB errors, or broken redirects.

### A. Authentication

* [ ] Navigate to `/register` and create a new user.

  * Check email + password validation.
  * **Source:** `app/register/page.tsx`, `lib/auth.ts`, `components/forms/RegisterForm.tsx`.
* [ ] Log in with the new account at `/login`.

  * Ensure dashboard redirect works.
  * **Source:** `app/login/page.tsx`, `lib/auth.ts`.

### B. Dashboard

* [ ] After login, `/dashboard` should load personalized data.

  * **Source:** `app/dashboard/page.tsx`, `components/dashboard/*`.

### C. Booking Flow

* [ ] Go to `/bookings/new`.
* [ ] Select a slot and submit booking.
* [ ] Verify redirect to `/bookings` with new entry.
* [ ] Try invalid data (past date, unavailable slot).

  * **Source:** `app/bookings/new/page.tsx`, `lib/bookings.ts`, `components/forms/BookingForm.tsx`.

### D. Donations Flow

* [ ] Visit `/donations`.
* [ ] Add a test donation.
* [ ] Verify donation shows up in list.

  * **Source:** `app/donations/page.tsx`, `lib/donations.ts`, `components/forms/DonationForm.tsx`.

### E. Admin Flow

* [ ] Log in as an admin.
* [ ] Access `/admin`.
* [ ] Check user list, bookings, and donations.

  * **Source:** `app/admin/page.tsx`, `lib/admin.ts`, `components/admin/*`.

---

## ⚡ Quick Notes

* Run `npm run dev` locally while testing.
* Watch browser console + server logs for errors.
* Cross-check styling (Tailwind) and component imports if pages break.