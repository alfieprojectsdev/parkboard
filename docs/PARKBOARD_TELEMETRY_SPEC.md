📘 **File:** `PARKBOARD_TELEMETRY_SPEC.md`
**Purpose:** Define how ParkBoard captures and manages *ethical, developer-facing usage analytics* during the alpha/beta phase — compatible with Supabase and your current schema.

---

````markdown
# PARKBOARD_TELEMETRY_SPEC.md
Version: 1.0  
Last Updated: 2025-10-14  
Author: Alfie

## 🧭 Purpose

This document defines the structure, behavior, and ethical constraints for **Usage Analytics (Behavioral Telemetry)** in the ParkBoard web app.  
Its purpose is to log **real user interactions during the alpha/beta test phase** — *only from consenting volunteer users* — to improve usability, performance, and reliability.

Telemetry will **not** track personally identifiable content beyond what’s necessary to associate interactions with user accounts.  
All logs are anonymized or pseudo-anonymized for privacy and GDPR-like compliance.

---

## ⚙️ 1. Overview

Telemetry provides lightweight instrumentation for:

- **User Flow Analysis** – sequences of actions (login → view slots → booking confirmation)
- **Feature Engagement** – which buttons, menus, or flows are most/least used
- **Performance Metrics** – latency between user actions and responses
- **Error Monitoring** – JS errors, booking submission failures, etc.

---

## 🗄️ 2. Database Integration

### 2.1. New Table: `user_behavior_logs`

```sql
CREATE TABLE user_behavior_logs (
  log_id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login', 'logout', 'view_slot', 'book_slot', 'cancel_booking',
    'update_profile', 'load_page', 'error', 'performance', 'custom'
  )),
  event_label TEXT,
  event_details JSONB,
  page_url TEXT,
  user_agent TEXT,
  referrer TEXT,
  ip_hash TEXT, -- SHA256 hashed client IP for uniqueness, not tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);
````

#### Indexes

```sql
CREATE INDEX idx_behavior_user_time ON user_behavior_logs (user_id, created_at DESC);
CREATE INDEX idx_behavior_event_type ON user_behavior_logs (event_type);
```

#### Security

Enable **RLS (Row-Level Security)** and a new policy group:

```sql
ALTER TABLE user_behavior_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY developers_can_read_behavior
  ON user_behavior_logs
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'developer');
```

Only developers or Supabase service roles can access the logs.

---

## 🧠 3. Event Model

### 3.1. Standard Event Object

```json
{
  "session_id": "UUIDv4 or Supabase session ID",
  "event_type": "book_slot",
  "event_label": "Confirm Booking Button",
  "event_details": {
    "slot_id": 12,
    "duration_minutes": 120,
    "price_estimate": 180.00
  },
  "page_url": "/slots/12",
  "user_agent": "Mozilla/5.0 ...",
  "referrer": "/home"
}
```

### 3.2. Minimal Example (page load)

```json
{
  "event_type": "load_page",
  "event_label": "/dashboard",
  "event_details": {}
}
```

---

## 🧩 4. Integration Points

| Layer          | Method                          | Description                                                               |
| -------------- | ------------------------------- | ------------------------------------------------------------------------- |
| Frontend       | JS Client SDK (Supabase insert) | Sends event objects via `supabase.from('user_behavior_logs').insert(...)` |
| Backend        | API Hook / Edge Function        | Optional: logs server-side events (e.g. errors, booking validations)      |
| Error Boundary | Global React boundary           | Captures unhandled JS errors as `event_type='error'`                      |
| Performance    | `PerformanceObserver` API       | Sends event_type='performance' for long tasks, slow network, etc.         |

---

## 🔒 5. Privacy & Ethics

1. **Explicit user consent** — volunteers must agree via checkbox or pre-launch message.
2. **No keylogging or private data capture.**
3. **Anonymized identifiers** – use session UUIDs and IP hashes only.
4. **Data retention:** logs older than 60 days are auto-purged.

   ```sql
   CREATE POLICY purge_old_behavior_logs AS
   DELETE FROM user_behavior_logs WHERE created_at < NOW() - INTERVAL '60 days';
   ```
5. **Access restricted** to developer/service roles only.

---

## 📈 6. Reporting & Analysis

For early telemetry reports, define views like:

### 6.1. `view_user_activity_summary`

```sql
CREATE VIEW view_user_activity_summary AS
SELECT
  user_id,
  COUNT(*) AS total_events,
  COUNT(DISTINCT session_id) AS unique_sessions,
  MAX(created_at) AS last_seen
FROM user_behavior_logs
GROUP BY user_id;
```

### 6.2. `view_feature_engagement`

```sql
CREATE VIEW view_feature_engagement AS
SELECT
  event_type,
  event_label,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM user_behavior_logs
GROUP BY event_type, event_label
ORDER BY event_count DESC;
```

---

## 🧪 7. Testing Plan (for Claude Code + Playwright)

* [ ] Simulate multiple user sessions with Playwright using different test users.
* [ ] Trigger representative event sequences (login, view slot, book, cancel).
* [ ] Assert that Supabase logs reflect accurate timestamps and event_type entries.
* [ ] Verify RLS enforcement — ordinary users cannot read telemetry rows.
* [ ] Confirm data retention policy removes records after 60 days.

---

## 🔧 8. Future Enhancements

* [ ] Optional lightweight dashboard (`/dev/usage-insights`) showing anonymized activity trends.
* [ ] Integration with Supabase Edge Logs for unified monitoring.
* [ ] Optional aggregation into `daily_usage_summary` table via CRON.
* [ ] Replace IP hashing with browser fingerprint (hashed, non-identifiable) if necessary for session accuracy.

---

## 📜 Naming Convention Summary

| Object           | Name                           |
| ---------------- | ------------------------------ |
| Table            | `user_behavior_logs`           |
| RLS Policy Group | `developers_can_read_behavior` |
| Summary View     | `view_user_activity_summary`   |
| Feature View     | `view_feature_engagement`      |

---

**End of Spec**

