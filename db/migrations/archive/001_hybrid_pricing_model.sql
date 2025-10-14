-- ============================================================================
-- MIGRATION: Hybrid Pricing Model
-- ============================================================================
-- Version: 001
-- Date: 2025-10-13
-- Description: Enable "Request Quote" listings alongside explicit pricing
--
-- Changes:
-- 1. Allow NULL values for price_per_hour (Request Quote slots)
-- 2. Update price constraint to allow NULL OR positive values
-- 3. Update booking price trigger to handle NULL prices
--
-- Backward Compatibility: ✅ SAFE
-- - All existing slots keep their prices (no data changes)
-- - Existing functionality unchanged
-- - Easy rollback available (see rollback script)
-- ============================================================================

-- ============================================================================
-- STEP 1: Relax price_per_hour constraint
-- ============================================================================

-- Remove NOT NULL constraint
ALTER TABLE parking_slots
  ALTER COLUMN price_per_hour DROP NOT NULL;

-- Drop old CHECK constraint
ALTER TABLE parking_slots
  DROP CONSTRAINT IF EXISTS parking_slots_price_per_hour_check;

-- Add new conditional CHECK constraint
-- Allow NULL (for Request Quote) OR positive values (for explicit pricing)
ALTER TABLE parking_slots
  ADD CONSTRAINT parking_slots_price_check
  CHECK (price_per_hour IS NULL OR price_per_hour > 0);

COMMENT ON CONSTRAINT parking_slots_price_check ON parking_slots IS
  'Allows NULL (Request Quote) or positive values (explicit pricing)';

-- ============================================================================
-- STEP 2: Update booking price calculation trigger
-- ============================================================================

-- Replace existing trigger function with NULL-aware version
CREATE OR REPLACE FUNCTION calculate_booking_price()
RETURNS TRIGGER AS $$
DECLARE
  v_price_per_hour DECIMAL(10,2);
  v_duration_hours DECIMAL(10,2);
BEGIN
  -- Get slot hourly rate
  SELECT price_per_hour INTO v_price_per_hour
  FROM parking_slots WHERE slot_id = NEW.slot_id;

  -- NEW: Prevent booking slots with no explicit price
  -- Users must contact owner directly for "Request Quote" slots
  IF v_price_per_hour IS NULL THEN
    RAISE EXCEPTION 'Cannot create instant booking for this slot. Please contact the owner to request a quote and arrange booking.'
      USING HINT = 'This slot uses "Request Quote" pricing. Call the owner for rates.';
  END IF;

  -- Calculate duration in hours (fractional)
  v_duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;

  -- Set total price (override any client-provided value)
  NEW.total_price := v_price_per_hour * v_duration_hours;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_booking_price() IS
  'Auto-calculates total_price from slot rate and duration. SECURITY: prevents client manipulation. Blocks instant booking for NULL-price slots.';

-- Note: Trigger already exists, no need to recreate
-- (Trigger: booking_price_calculation BEFORE INSERT OR UPDATE ON bookings)

-- ============================================================================
-- STEP 3: Add helper function to check if slot allows instant booking
-- ============================================================================

CREATE OR REPLACE FUNCTION slot_allows_instant_booking(p_slot_id INT)
RETURNS BOOLEAN AS $$
DECLARE
  v_price DECIMAL(10,2);
  v_status TEXT;
BEGIN
  SELECT price_per_hour, status INTO v_price, v_status
  FROM parking_slots
  WHERE slot_id = p_slot_id;

  -- Slot must exist, be active, and have explicit pricing
  RETURN v_price IS NOT NULL AND v_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION slot_allows_instant_booking IS
  'Returns TRUE if slot has explicit pricing (not Request Quote). Used to disable booking button in UI.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check constraint was updated
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'parking_slots'::regclass
  AND conname = 'parking_slots_price_check';

-- Verify existing slots still have prices (should return 0 NULL prices)
SELECT COUNT(*) as request_quote_slots
FROM parking_slots
WHERE price_per_hour IS NULL;

-- Verify trigger function was updated
SELECT prosrc
FROM pg_proc
WHERE proname = 'calculate_booking_price';

-- Test helper function
SELECT slot_id, slot_number, price_per_hour, slot_allows_instant_booking(slot_id) as instant_booking
FROM parking_slots
WHERE status = 'active'
LIMIT 5;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Expected results:
-- ✅ price_per_hour can now be NULL
-- ✅ Existing slots unchanged (all still have prices)
-- ✅ New slots can be created with NULL price
-- ✅ Booking trigger prevents instant booking for NULL-price slots
-- ✅ Helper function available for UI logic

-- Next steps:
-- 1. Update frontend UI to handle NULL prices
-- 2. Update slot creation form to allow "Request Quote" option
-- 3. Add tests for NULL price scenarios
-- 4. Deploy to staging and test end-to-end

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to revert this migration, run:
--   db/migrations/001_hybrid_pricing_model_rollback.sql
-- ============================================================================
