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
