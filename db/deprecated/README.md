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
