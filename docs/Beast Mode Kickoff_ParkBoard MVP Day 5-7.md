# Beast Mode Continuation — ParkBoard MVP (Day 5–7)

You are still in **Beast Mode.** Work step by step to deliver the ParkBoard MVP according to the **AI Playbook in .github/copilot-instructions.md**.  

## Mission
- Execute **Day 5:** Polish & mobile responsiveness.  
- Execute **Day 6:** Deployment to Vercel + onboarding docs.  
- Execute **Day 7:** Launch prep, bug fixes, and feedback loop.  
- No new features — this is polish and ship only.  

## Your Discipline
1. **Always start with a plan.**
   - Outline exact polish/deployment tasks.  
   - List file paths or configs to touch.  
   - Include shell/Vercel commands as needed.  
2. **Then deliver code.**
   - Compile-ready, tested, production-safe.  
   - No placeholders, no "TODO".  
3. **Guardrails.**
   - Do not change schema or enums.  
   - No new features beyond MVP scope.  
   - Keep UI mobile-first and simple (this replaces a Viber chat, not Airbnb).  
   - Use `.env.local` for secrets only — never commit keys.  

---

## Step 5 — Day 5: Polish & Mobile Responsiveness
- Apply Tailwind responsive classes to all components:
  - Navigation collapses properly on small screens.  
  - Slot grid adapts to mobile layout.  
  - Booking forms are touch-friendly.  
- Add clear error and success messages (booking conflict, slot closed, etc.).  
- Ensure happy path is fully testable end-to-end.  
- Add loading states for all async actions.  

Deliverables:  
- Updated UI components with Tailwind responsive utilities.  
- Verified user flow: Login → New Booking → Confirm → Cancel.  

---

## Step 6 — Day 6: Deployment
- Set up `.env.local` with Supabase keys (anon + service).  
- Configure Vercel project connected to GitHub repo.  
- Ensure build works with Next.js 14+ App Router.  
- Deploy to Vercel with production Supabase credentials.  
- Write `/docs/README.md` for onboarding:
  - How to run locally.  
  - How to deploy.    
  - How to seed/reset DB.  
  - Roles (resident vs admin).  

Deliverables:  
- Live Vercel URL.  
- `/docs/README.md` complete.  

---

## Step 7 — Day 7: Launch Prep & Bug Fixes
- Perform real-world booking tests with multiple accounts.  
- Confirm RLS policies work:
  - Residents cannot see/edit others’ bookings.  
  - Admin has full override.  
- Fix timezone edge cases (store UTC, render local).  
- Patch any errors from Vercel logs.  
- Document known issues in `/docs/known_issues.md`.  

Deliverables:  
- Stable production build on Vercel.  
- Documented known issues + feedback plan.  

---

## Execution Protocol
1. Start with Step 5 (polish).  
2. Pause and summarize after UI polish is complete.  
3. Continue to Step 6 (deployment), confirm live site works.  
4. Pause and summarize.  
5. Continue to Step 7 (launch prep & fixes).  
6. After Step 7, stop and summarize. Await approval before expanding beyond MVP.  

Be scope-locked, production-focused, and ruthless about cutting extras. Ship first, improve later.
