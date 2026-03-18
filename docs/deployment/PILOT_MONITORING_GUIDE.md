# 🛰️ ParkBoard Pilot Monitoring & Test User Reference
**File:** `docs/PILOT_MONITORING_GUIDE.md`  
**Purpose:** Define telemetry, monitoring, and ethical testing workflow for alpha/beta phase using *synthetic test users* (`@parkboard.test`).  
**Primary Consumer:** Claude Code (implementation reference)

---

## 1. Pilot Context

### 1.1 Objective
Implement lightweight journaling and automated flow validation for **controlled testing** with 5–10 volunteer testers using pre-configured `.test` accounts — not real user data.  
Goal: identify UX friction points, verify booking logic, and validate multi-user concurrency handling.

### 1.2 Scope
- Applies to **ParkBoard Alpha/Beta** (Lumiere Residences community only)
- Limited to `user1@parkboard.test` through `user20@parkboard.test`
- No external users or real PII

### 1.3 Ethical Guidelines
> This pilot records feature usage by test accounts to improve ParkBoard’s reliability.  
> No personal data is collected or stored. Data will be purged after analysis (≤ 30 days).

---

## 2. Test User Accounts

### 2.1 Credential Pattern
```

Email Pattern: user{N}@parkboard.test (N = 1–20)
Password: test123456
Community: LMR (Lumiere Residences)
Units: 10A–29T

````

### 2.2 Test Roles
| Role | Accounts | Description |
|------|-----------|--------------|
| **Renter** | user1–user10 | Booking flow testing |
| **Owner** | user11–user20 | Slot listing, pricing, and management |
| **Dual** | Any | Can test both behaviors |

---

## 3. Telemetry Design

### 3.1 Table Schema (Supabase)
```sql
CREATE TABLE IF NOT EXISTS user_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ui_context TEXT NULL,
  event_payload JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events (event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events (created_at);
````

### 3.2 Log Helper

```js
// /lib/logEvent.js
import { supabase } from '@/lib/supabaseClient';

export async function logEvent(eventType, payload = {}, ui = null) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  const sessionId = session?.access_token?.slice(0, 16) ?? 'anon';

  // Only log for test users
  if (!session?.user?.email?.endsWith('@parkboard.test')) return;

  await supabase.from('user_events').insert({
    user_id: userId,
    session_id: sessionId,
    event_type: eventType,
    ui_context: ui,
    event_payload: payload,
  });
}
```

✅ Prevents logs from any production user (only `.test` accounts are recorded).

---

## 4. Test Scenarios (For Pilot Run)

| Scenario                   | User(s)           | Description                         |
| -------------------------- | ----------------- | ----------------------------------- |
| **1. First-Time Renter**   | `user1`           | Booking flow from browse → confirm  |
| **2. Slot Owner Listing**  | `user11`          | Slot creation with explicit price   |
| **3. Request Quote Flow**  | `user12`, `user2` | Contact owner instead of booking    |
| **4. Booking Management**  | `user1`, `user11` | Verify owner/renter views           |
| **5. Conflict Prevention** | `user1`, `user2`  | Verify overlapping bookings blocked |

*(See `docs/PARKBOARD_TEST_USERS.md` for full detailed steps.)*

---

## 5. Queries for Analysis

**Event distribution:**

```sql
SELECT event_type, COUNT(*) FROM user_events GROUP BY event_type;
```

**Feature funnel:**

```sql
SELECT
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'VIEW_SLOTS') AS viewed,
  COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'BOOK_SLOT') AS booked
FROM user_events;
```

**Conflict validation (QA check):**

```sql
SELECT slot_id, COUNT(*)
FROM user_events
WHERE event_type = 'BOOK_SLOT'
GROUP BY slot_id
HAVING COUNT(*) > 1;
```

---

## 6. Automation Layer (Optional)

### 6.1 Playwright Tests

* **Verify SSO (Google/Facebook)** — sign-in completes successfully
* **Run core flows:** login → browse → book → cancel
* **Check DB writes:** event appears in `user_events`
* **Repeat nightly** in CI/CD (synthetic flow validation)

### 6.2 CI Integration

Add environment variable:

```
NEXT_PUBLIC_ENABLE_JOURNALING=true
```

Wrap `logEvent()` calls with this flag to disable easily post-pilot.

---

## 7. Retention & Cleanup Policy

| Type               | Policy                        |
| ------------------ | ----------------------------- |
| Test user accounts | Reset after each sprint       |
| Journaling data    | Purge 30 days post-pilot      |
| Logs               | Export summary → delete rows  |
| Feedback forms     | Optional, anonymized manually |

---

## 8. Next Actions (For Claude Code)

1. Confirm `user_events` table exists (skip if already present).
2. Add `logEvent.js` and integrate into:

   * Auth success handler
   * Booking confirmation action
   * Cancellation and error flows
3. Guard all logging behind `.test` domain check and `.env` flag.
4. Push Playwright test flow that validates journaling pipeline end-to-end.
5. Generate summarized event insights after 1–2 weeks.

---

## 9. Future Options

* Add `test_user_profiles` table with tester notes, consent timestamps.
* Integrate PostHog or Supabase Edge cron summaries.
* Enable anonymized production analytics once pilot is complete.

---

## Document Metadata

**Version History:**
- v1.1 (Current) - Full implementation ready - 2025-10-14
- v1.0 (Alpha Pilot Ready) - Initial version

**Document Details:**
- **Path:** `/docs/PILOT_MONITORING_GUIDE.md`
- **Maintainer:** ParkBoard Dev Team
- **Last Updated:** 2025-10-14
- **Status:** Implementation Ready

**AI Assistance:**
- **Model:** GPT-5
- **Reference Session:** [ChatGPT Discussion](https://chatgpt.com/c/68edeb6c-4374-8324-bba7-f59432d38328)
