# =============================================================================
# Database Migration Structure Setup
# Run this script to organize your database files
# =============================================================================

#!/bin/bash

echo "Creating consolidated database structure..."

# Create new directory structure
mkdir -p db/deprecated
mkdir -p db/migrations
mkdir -p db/seeds

# Move deprecated files
echo "Moving deprecated files..."
mv db/schema_v1.sql db/deprecated/ 2>/dev/null || echo "schema_v1.sql not found"
mv db/schema_setup_templates.sql db/deprecated/ 2>/dev/null || echo "schema_setup_templates.sql not found"
mv db/schema_v2.sql db/deprecated/schema_v2.sql 2>/dev/null || echo "schema_v2.sql not found"

# Create deprecated README
cat > db/deprecated/README.md << 'EOF'
# Deprecated Database Files

This directory contains old database schema files that are no longer active.
They are preserved for historical reference only.

## Files

- `schema_v1.sql` - Original schema with basic structure
- `schema_v2.sql` - Enhanced schema with Supabase auth integration  
- `schema_setup_templates.sql` - Template collection (redundant)

## Current Files (in parent directory)

- `schema.sql` - **Active production schema** (consolidated from schema_v2.sql)
- `rls_policies.sql` - Row Level Security policies
- `seed_testing.sql` - Development seed data

## Migration History

- v1 → v2: Added Supabase auth integration, improved constraints
- v2 → consolidated: Renamed to schema.sql, added helper functions

Do not use files in this directory for new installations.
EOF

# Create migration template
cat > db/migrations/000_migration_template.sql << 'EOF'
-- =============================================================================
-- Migration: [DESCRIPTION]
-- Date: [DATE]
-- Author: [AUTHOR]
-- =============================================================================

-- Add your migration SQL here
-- Example:
-- ALTER TABLE bookings ADD COLUMN new_field TEXT;
-- CREATE INDEX idx_bookings_new_field ON bookings(new_field);

-- Remember to:
-- 1. Test on development database first
-- 2. Add corresponding rollback instructions in comments
-- 3. Update any affected RLS policies
-- 4. Document breaking changes

-- Rollback instructions (commented):
-- DROP INDEX IF EXISTS idx_bookings_new_field;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS new_field;
EOF

# Extract seed data from wipe_and_seed_testing.sql
echo "Creating consolidated seed file..."
cat > db/seeds/development.sql << 'EOF'
-- =============================================================================
-- Development Seed Data
-- Extracted from wipe_and_seed_testing.sql
-- =============================================================================

-- Clear existing data
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- Test user profiles (using fake UUIDs for development)
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
('11111111-1111-1111-1111-111111111111', 'Alice Resident', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Resident', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'HOA', 'carol@example.com', '09170001122', 'ADMIN-01', 'admin');

-- Sample parking slots
INSERT INTO parking_slots (slot_number, slot_type, status, description)
VALUES
('A-001', 'covered', 'available', 'Near main entrance'),
('A-002', 'covered', 'available', 'Near elevator'),
('A-003', 'covered', 'maintenance', 'Under repair'),
('B-001', 'uncovered', 'available', 'Good for SUV'),
('B-002', 'uncovered', 'available', 'Compact cars preferred'),
('B-003', 'uncovered', 'available', 'Standard size'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking');

-- Sample bookings (future dates)
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'confirmed', 'Test booking for Alice'),
('22222222-2222-2222-2222-222222222222', 2, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '6 hours', 'confirmed', 'Test booking for Bob');

-- Sample payments
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
VALUES
(1, 100.00, 'cash', 'completed', 'CASH001'),
(2, 150.00, 'gcash', 'pending', 'GC002');
EOF

# Create production seed file
cat > db/seeds/production.sql << 'EOF'
-- =============================================================================
-- Production Seed Data
-- Minimal data for production deployment
-- =============================================================================

-- Add initial parking slots (customize for your building)
INSERT INTO parking_slots (slot_number, slot_type, status, description)
VALUES
('P-001', 'covered', 'available', 'Premium covered slot'),
('P-002', 'covered', 'available', 'Premium covered slot'),
('P-003', 'covered', 'available', 'Premium covered slot'),
('U-001', 'uncovered', 'available', 'Standard uncovered slot'),
('U-002', 'uncovered', 'available', 'Standard uncovered slot'),
('U-003', 'uncovered', 'available', 'Standard uncovered slot'),
('U-004', 'uncovered', 'available', 'Standard uncovered slot'),
('U-005', 'uncovered', 'available', 'Standard uncovered slot'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking');

-- Note: User profiles will be created automatically via auth signup process
-- Note: No test bookings or payments in production
EOF

# Create database setup script
cat > db/setup_database.sql << 'EOF'
-- =============================================================================
-- Complete Database Setup Script
-- Run this in Supabase SQL Editor for new installations
-- =============================================================================

-- 1. Create schema
\i schema.sql

-- 2. Apply security policies  
\i rls_policies.sql

-- 3. Load seed data (choose appropriate file)
-- For development:
-- \i seeds/development.sql
-- For production:
-- \i seeds/production.sql
EOF

# Create migration runner script
cat > db/run_migration.sh << 'EOF'
#!/bin/bash
# Simple migration runner for development
# Usage: ./run_migration.sh migration_file.sql

if [ -z "$1" ]; then
    echo "Usage: $0 <migration_file.sql>"
    echo "Example: $0 migrations/001_add_slot_ownership.sql"
    exit 1
fi

MIGRATION_FILE="$1"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file '$MIGRATION_FILE' not found"
    exit 1
fi

echo "Running migration: $MIGRATION_FILE"
echo "Make sure to:"
echo "1. Backup your database first"
echo "2. Test on development database"
echo "3. Review the migration file"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Copy and paste this into Supabase SQL Editor:"
    echo "----------------------------------------"
    cat "$MIGRATION_FILE"
    echo "----------------------------------------"
else
    echo "Migration cancelled"
fi
EOF

chmod +x db/run_migration.sh

echo "✅ Database structure reorganized!"
echo ""
echo "New structure:"
echo "db/"
echo "├── schema.sql (main production schema)"
echo "├── rls_policies.sql (security policies)"  
echo "├── useful_queries.sql (developer utilities)"
echo "├── setup_database.sql (complete setup script)"
echo "├── seeds/"
echo "│   ├── development.sql (test data)"
echo "│   └── production.sql (minimal prod data)"
echo "├── migrations/"
echo "│   └── 000_migration_template.sql"
echo "├── deprecated/"
echo "│   ├── README.md"
echo "│   └── [old schema files]"
echo "└── run_migration.sh (migration helper)"
echo ""
echo "Next steps:"
echo "1. Review db/schema.sql"
echo "2. Run the setup script for new databases"
echo "3. Use migrations/ for future schema changes"