<!-- `/docs/phase2-slot-ownership.md` -->

# Phase 2 Upgrade Plan: Slot Ownership

## Goal
Add the ability to assign parking slots to residents (owners). This supports condos where slots are deeded, permanently assigned, or managed directly by residents.

---

## Schema Upgrade (DDL)

```sql
-- Add owner_id to parking_slots
ALTER TABLE parking_slots
ADD COLUMN owner_id uuid REFERENCES auth.users (id);

-- Optional: enforce ownership assignment only once per slot
ALTER TABLE parking_slots
ADD CONSTRAINT unique_slot_owner UNIQUE (slot_id, owner_id);
````

---

## RLS Policies (Phase 2)

```sql
-- Enable RLS if not already enabled
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;

-- Slot owners can view their own slots
CREATE POLICY "Slot owners can view own slots"
  ON parking_slots FOR SELECT
  USING (owner_id = auth.uid());

-- Slot owners can update their own slots
CREATE POLICY "Slot owners can update own slots"
  ON parking_slots FOR UPDATE
  USING (owner_id = auth.uid());

-- Admins can view all slots
CREATE POLICY "Admins can view all slots"
  ON parking_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Admins can update all slots
CREATE POLICY "Admins can update all slots"
  ON parking_slots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Bookings adjustment: allow booking only if user is slot owner OR admin
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;

CREATE POLICY "Users can book slots they own"
  ON bookings FOR INSERT
  WITH CHECK (user_id = auth.uid()
              AND EXISTS (
                SELECT 1 FROM parking_slots ps
                WHERE ps.slot_id = bookings.slot_id
                  AND ps.owner_id = auth.uid()
              ));

CREATE POLICY "Admins can create bookings for any slot"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );
```

---

## Migration Notes

* This upgrade adds ownership but does not **require** all slots to have owners.
* You can leave `owner_id` NULL for visitor/guest/shared slots.
* If mixed usage is needed, keep both owned and shared slots in the same table.

---

## Rollout Strategy

1. Add `owner_id` column.
2. Assign owners for deeded/assigned slots.
3. Apply new RLS policies.
4. Update frontend to reflect ownership restrictions.

---

## Status

This plan is **not applied in MVP (Option 1: Shared Slots)**.
It is documented for **future rollout** when ownership becomes a requirement.