Not exactly 3 *user flows*, Alfie — more like **3 phases of scope** (same flows, but different levels of completeness). Think of it as a ladder:

---

# 🚀 ParkBoard Scope Ladder

## ✅ MVP (Weekend Scope – must-have flows only)

*Goal: replace Viber GC’s chaos with structured search + booking*

**Resident (Renter):**

* Sign up / login
	* `components/AuthWrapper.js`
* See list of currently available slots
	* `components/SlotGrid.js`
* Pick date/time → book slot
* Cancel upcoming booking
* View booking history

**Slot Owner (as “Admin” for their slot):**

* Login
* Add basic slot info (slot number + description)
* Mark slot as “available” or “maintenance” (no advanced scheduling yet)

**HOA/System Admin:**

* Very minimal → just see list of slots and bookings (read-only)

👉 Outcome: Renters can find and book slots easily, owners can toggle availability. That’s it.

---

## ➕ MVP+ (Next Iteration – smooths pain points)

*Goal: make it more usable day-to-day, not just a prototype*

**Resident (Renter):**

* Search/filter slots by date & time
* Browse slots with richer details (location, landmark, optional photo)
* Notifications (email/SMS/push-lite if feasible via Supabase Functions)

**Slot Owner:**

* Define recurring availability templates (e.g. weekdays 8–6)
* Set optional rent price (not payment yet, just display)
* Edit slot profile once (landmark, directions, etc.) instead of retyping

**HOA/System Admin:**

* Override slot status (force mark available/unavailable)
* Suspend abusive users (lightweight user moderation)

👉 Outcome: Easier slot discovery, less manual overhead for owners, basic governance for HOA.

---

## 🌐 Future (Scaling & Full Platform)

*Goal: professional-grade booking system, community-ready*

**Resident (Renter):**

* Waitlists (if slot full, join queue)
* Real-time notifications when slot frees up
* Mobile app (PWA/native hybrid)

**Slot Owner:**

* Payments (Stripe, GCash, etc.)
* Revenue reports / payout history
* Multi-slot management for owners with >1 slot

**HOA/System Admin:**

* Full analytics dashboard (usage trends, occupancy rates)
* Community-wide rules enforcement (max rental hours, fees, etc.)
* Integrations (CCTV, gate entry validation, vehicle plate recognition)

👉 Outcome: A serious, scalable platform — no longer just “Viber GC replacement.”

---

⚡ So the **3 buckets aren’t 3 user flows**. They’re **3 levels of capability** applied *across all flows*.

Do you want me to **turn this into a visual “flow matrix”** (rows = user roles, columns = MVP/MVP+/Future) so it’s easier to reference when scoping features?
