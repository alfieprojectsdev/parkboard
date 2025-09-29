-- =============================================================================
-- Production Seed Data (Updated for Schema v3 with Slot Ownership)
-- Minimal, real-world ready data for production deployment
-- =============================================================================

-- =============================================================================
-- PARKING SLOTS SETUP (Customize for your actual building)
-- =============================================================================

-- Premium covered parking (Level A) - These can be assigned to owners
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
('A-001', 'covered', 'available', NULL, 'Premium covered - Near elevator'),
('A-002', 'covered', 'available', NULL, 'Premium covered - Near entrance'),
('A-003', 'covered', 'available', NULL, 'Premium covered - Corner spot'),
('A-004', 'covered', 'available', NULL, 'Premium covered - Wide space'),
('A-005', 'covered', 'available', NULL, 'Premium covered - End unit');

-- Standard uncovered parking (Level B) - Mix of owned and shared
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
('B-001', 'uncovered', 'available', NULL, 'Standard - Good for compact cars'),
('B-002', 'uncovered', 'available', NULL, 'Standard - Regular size'),
('B-003', 'uncovered', 'available', NULL, 'Standard - SUV friendly'),
('B-004', 'uncovered', 'available', NULL, 'Standard - Near exit'),
('B-005', 'uncovered', 'available', NULL, 'Standard - Shaded area'),
('B-006', 'uncovered', 'available', NULL, 'Standard - Well-lit'),
('B-007', 'uncovered', 'available', NULL, 'Standard - Easy access'),
('B-008', 'uncovered', 'available', NULL, 'Standard - Back row');

-- Visitor parking (always shared)
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
('V-001', 'visitor', 'available', NULL, 'Visitor - Near reception'),
('V-002', 'visitor', 'available', NULL, 'Visitor - Easy access'),
('V-003', 'visitor', 'available', NULL, 'Visitor - Temporary parking only');

-- =============================================================================
-- INITIAL ADMIN SETUP
-- Note: This creates a template admin profile that needs to be linked
-- to a real auth.users account after signup
-- =============================================================================

-- No user profiles are inserted here - they will be created through:
-- 1. Users sign up through the app (creates auth.users)
-- 2. Profile is auto-created during signup process
-- 3. First user can be promoted to admin manually via SQL:
--    UPDATE user_profiles SET role = 'admin' WHERE email = 'your-admin@email.com';

-- =============================================================================
-- SLOT OWNERSHIP ASSIGNMENT (Optional - can be done via admin UI)
-- =============================================================================

-- Example: If you have deeded/assigned slots, you can assign them after users exist:
-- UPDATE parking_slots SET owner_id = 'user-uuid-here' WHERE slot_number = 'A-001';
-- 
-- Or leave all slots as shared initially and assign through admin interface

-- =============================================================================
-- CONFIGURATION NOTES FOR PRODUCTION
-- =============================================================================

/*
DEPLOYMENT CHECKLIST:

1. Database Setup:
   - Run schema_v3_unified.sql first
   - Run this production.sql seed file
   - Verify RLS policies are active

2. First Admin Setup:
   - Have admin sign up normally through /login
   - Manually promote to admin: UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@yourdomain.com';
   - Admin can then manage other users through /admin/users

3. Slot Assignment:
   - Use admin interface at /admin/slots to assign ownership
   - Or import via SQL if you have a spreadsheet of assignments

4. Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY  
   - SUPABASE_SERVICE_ROLE_KEY (for profile creation)

5. Email Configuration (for password reset):
   - Configure SMTP in Supabase Auth settings
   - Set password reset redirect URL

6. Optional Customizations:
   - Update slot numbers to match your building layout
   - Adjust slot types based on your parking structure
   - Modify descriptions to match your building features

SAMPLE SLOT ASSIGNMENTS (uncomment and modify as needed):
*/

-- Example: Assign slots to specific units (after users are created)
-- UPDATE parking_slots SET owner_id = (SELECT id FROM user_profiles WHERE unit_number = '101A') WHERE slot_number = 'A-001';
-- UPDATE parking_slots SET owner_id = (SELECT id FROM user_profiles WHERE unit_number = '102A') WHERE slot_number = 'A-002';

-- =============================================================================
-- VERIFICATION QUERIES (run these to check production setup)
-- =============================================================================

/*
-- Check slot distribution
SELECT 
  slot_type,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  COUNT(*) - COUNT(owner_id) as shared_slots
FROM parking_slots 
GROUP BY slot_type;

-- Check if any admin users exist
SELECT COUNT(*) as admin_count FROM user_profiles WHERE role = 'admin';

-- List all slots with ownership status
SELECT 
  slot_number,
  slot_type,
  status,
  CASE 
    WHEN owner_id IS NULL THEN 'SHARED'
    ELSE 'OWNED'
  END as ownership_status,
  description
FROM parking_slots 
ORDER BY slot_number;
*/