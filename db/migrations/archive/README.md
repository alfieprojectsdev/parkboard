# Migration Archive

**Status:** ⚠️ DO NOT USE THESE FILES FOR PRODUCTION

## Purpose

This folder contains **non-idempotent** migration files that were archived on **2025-10-14** during a cleanup to enforce industry-standard idempotent migration practices.

## Why These Files Are Archived

These migration files were the original versions created during development. They work correctly **on first run**, but will **fail if run twice** because they use non-idempotent SQL patterns:

```sql
-- ❌ Non-idempotent patterns (will error on second run)
CREATE TABLE communities (...);       -- ERROR: relation already exists
CREATE INDEX idx_name ON table(...);  -- ERROR: index already exists
CREATE FUNCTION func_name();          -- ERROR: function already exists
CREATE POLICY "policy" ON table;      -- ERROR: policy already exists
```

## What To Use Instead

**✅ Use the idempotent versions in the parent directory:**

| Archived File (DON'T USE) | Use This Instead ✅ |
|---------------------------|---------------------|
| `001_hybrid_pricing_model.sql` | `../001_hybrid_pricing_model_idempotent.sql` |
| `002_multi_tenant_communities.sql` | `../002_multi_tenant_communities_idempotent.sql` |
| `003_community_rls_policies.sql` | `../003_community_rls_policies_idempotent.sql` |

## Idempotent Migrations - Industry Standard

**All production migrations MUST be idempotent** for these critical reasons:

1. **CI/CD Safety** - Automated pipelines can retry failed deployments
2. **Team Collaboration** - Multiple developers can run migrations independently
3. **Disaster Recovery** - Migrations can be replayed during recovery
4. **Testing** - Test environments can be reset reliably
5. **Human Error Protection** - Accidental double-execution won't break production

### Industry Examples

- **Rails:** `create_table if_not_exists`
- **Flyway/Liquibase:** Checksum-based migration tracking
- **Alembic (Python):** Revision-based migration system
- **Knex.js:** Transaction-based migrations
- **Django:** Dependency-tracked migrations

### Idempotent Pattern Reference

```sql
-- ✅ GOOD - Safe to run multiple times
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
DROP TABLE IF EXISTS old_table CASCADE;
CREATE OR REPLACE FUNCTION calculate_price();
DROP POLICY IF EXISTS "policy_name" ON table_name;
DROP CONSTRAINT IF EXISTS constraint_name;

-- ❌ BAD - Will error on second run
CREATE TABLE users (...);
CREATE INDEX idx_email ON users(email);
DROP TABLE old_table;
CREATE FUNCTION calculate_price();
CREATE POLICY "policy" ON table;
ALTER TABLE DROP CONSTRAINT constraint_name;
```

## Why Keep These Files?

These archived files are kept for:
- **Historical Reference** - Understanding the original implementation
- **Documentation** - Showing what changes were made
- **Learning** - Demonstrating the difference between idempotent and non-idempotent SQL
- **Rollback Reference** - In case we need to understand the original structure

## When Were These Archived?

- **Date:** 2025-10-14
- **Reason:** Enforcing industry-standard idempotent migration practices
- **By:** Multi-tenant implementation cleanup
- **Related Doc:** `docs/MULTI_TENANT_IMPLEMENTATION_20251014.md`

## Do Not Delete

These files should NOT be deleted because:
1. They document the original migration approach
2. They serve as educational examples
3. They may be referenced in other documentation
4. Git history alone doesn't show the idempotent transformation

---

**Remember:** Always use the idempotent versions in the parent directory for any database changes!
