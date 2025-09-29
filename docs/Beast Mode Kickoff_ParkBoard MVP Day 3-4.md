# Beast Mode Continuation — ParkBoard MVP (Day 3–4)

You are still in **Beast Mode**. Work systematically, step by step, to deliver the ParkBoard MVP according to the **AI Playbook in .github/copilot-instructions.md**.  

## Mission
- Execute **Day 3** (Resident UI: login, view slots, book/cancel).  
- Execute **Day 4** (Admin UI: view/manage bookings, slot control, admin override).  
- Do not attempt Day 5+ (polish/deploy) until explicitly instructed.  

## Your Discipline
1. **Always start with a plan.**
   - Outline tasks, file paths, and data flow.  
   - Confirm which API routes are being used.  
2. **Then deliver code.**
   - Provide compile-ready, working components.  
   - Modify existing components, don’t duplicate.  
3. **Guardrails.**
   - Use the **canonical component list** from the Playbook.  
   - Enforce frozen schema and status enum.  
   - Store all times in UTC, format on render.  
   - No feature creep — just the MVP flows.  

---

## Step 3 — Day 3: Resident UI
Implement the full resident booking flow:

- **Auth & Navigation**
  - Ensure `/components/AuthWrapper.js` and `/components/Navigation.js` are wired to Supabase Auth.  
  - Show resident vs admin navigation correctly.  

- **Resident Dashboard**
  - `/components/UserDashboard.js` → Tabs for "My Bookings" and "New Booking".  
  - `/components/UserBookingsList.js` → List bookings, cancel button (calls PUT `/api/bookings/[id]`).  
  - `/components/BookingForm.js` → Uses `/components/TimeRangePicker.js` + `/components/SlotGrid.js`.  
  - `/components/BookingConfirmation.js` → Final confirmation step, POST `/api/bookings`.  

Deliverables:
- Updated components listed above.  
- Pages: `/pages/dashboard.js` (resident entrypoint).  

---

## Step 4 — Day 4: Admin UI
Implement the admin control panel:

- **Admin Dashboard**
  - `/components/AdminDashboard.js` → Tabs: "All Bookings", "Slots", "Users".  
  - View all bookings via GET `/api/admin/bookings`.  
  - Manage slot status (open/closed/maintenance) via PUT `/api/slots/[id]`.  
  - Manage users (basic: list, change role) — admin-only.  

- **UI Elements**
  - Reuse existing components where possible (`SlotGrid`, `BookingCard`).  
  - Keep layout simple, mobile-first.  

Deliverables:
- Updated `/components/AdminDashboard.js`.  
- Page: `/pages/admin.js` (admin entrypoint).  

---

## Execution Protocol
1. **Start with Step 3 plan** → list resident UI flows + modified files.  
2. Generate code in small chunks (per component).  
3. Pause, summarize progress, verify alignment.  
4. Proceed to Step 4 (admin UI) only after confirmation.  
5. After Step 4, stop and summarize. Wait for approval before moving to Day 5.  

Be ruthless, scope-locked, and methodical. Always align with the AI Playbook.
