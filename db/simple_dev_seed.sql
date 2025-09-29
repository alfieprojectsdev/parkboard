-- =============================================================================
-- Simple Development Approach: Just add slots to production.sql setup
-- Run this AFTER users have signed up normally through the app
-- =============================================================================

-- Add more slots for testing ownership features
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
-- Additional premium slots for testing
('A-006', 'covered', 'available', NULL, 'Premium covered - Test slot'),
('A-007', 'covered', 'available', NULL, 'Premium covered - Test slot'),
('A-008', 'covered', 'available', NULL, 'Premium covered - Test slot'),

-- More standard slots  
('B-009', 'uncovered', 'available', NULL, 'Standard - Test slot'),
('B-010', 'uncovered', 'available', NULL, 'Standard - Test slot'),
('B-011', 'uncovered', 'available', NULL, 'Standard - Test slot'),

-- Additional visitor slots
('V-004', 'visitor', 'available', NULL, 'Visitor - Test slot'),
('V-005', 'visitor', 'available', NULL, 'Visitor - Test slot');

-- =============================================================================
-- MANUAL TESTING WORKFLOW (recommended approach)
-- =============================================================================

/*
STEP-BY-STEP TESTING:

1. Use production.sql (clean slate)
2. Test signup flow:
   - Go to /login
   - Sign up as alice@test.com / password123
   - Sign up as bob@test.com / password123  
   - Sign up as admin@test.com / password123

3. Promote admin user:
   UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@test.com';

4. Test slot ownership assignment via admin UI:
   - Login as admin@test.com
   - Go to /admin/slots
   - Assign A-001 to Alice
   - Assign A-002 to Bob
   - Keep other slots as shared

5. Test ownership features:
   - Login as alice@test.com
   - Go to dashboard → should see A-001 as "Your Slot"
   - Try booking A-001 → should work
   - Try booking A-002 → should show "Reserved for another resident"
   - Try booking B-001 → should work (shared slot)

This approach tests:
✓ Real signup flow
✓ Profile creation during signup  
✓ Admin promotion
✓ Slot ownership assignment via UI
✓ Ownership validation in booking flow
✓ Mixed owned/shared slot behavior

Much more realistic than fake auth data!
*/

-- Quick verification of added slots
SELECT 
  COUNT(*) as total_slots,
  COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as owned_slots,
  COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as shared_slots
FROM parking_slots;