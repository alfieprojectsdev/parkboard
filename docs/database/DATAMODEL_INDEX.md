# ParkBoard Data Model Documentation Index

**Generated:** 2026-03-18
**Total Documentation:** 2,100+ lines across 4 comprehensive guides
**Coverage:** 6 tables, 13 indexes, 4 triggers, 8+ RLS policies

---

## Quick Start - Choose Your Guide

### 👨‍💼 I'm a Manager/Architect
**→ Start here:** `DATAMODEL_SUMMARY.txt`
- Executive overview (5 min read)
- Key findings and security guarantees
- Performance characteristics
- Table inventory at a glance

---

### 👨‍💻 I'm a Developer Implementing Features
**→ Start here:** `DATAMODEL_REFERENCE.md`
- Common query patterns with examples
- Auto-calculated fields warning (don't set total_price!)
- Type conversion guide
- Error prevention patterns
- Testing data models

---

### 🔍 I'm Doing Code Review / Debugging
**→ Start here:** `DATAMODEL_ANALYSIS.md`
- Comprehensive table documentation
- Field-level type reference
- Constraint details
- Trigger mechanisms
- Security features explained
- RLS policy rationale

---

### 📊 I'm Optimizing Database Queries
**→ Start here:** `DATAMODEL_SCHEMA_VISUAL.md`
- Visual table structures with field details
- ER diagram relationships
- Index performance matrix
- Constraint hierarchy
- Trigger flow diagrams

---

## Document Descriptions

### 1. DATAMODEL_ANALYSIS.md (702 lines, 26KB)
**Comprehensive Reference - Most Detailed**

What's inside:
- Executive summary with key findings
- 6 tables documented completely (fields, constraints, indexes, triggers, RLS)
- Relationships section (entity diagram, cardinality matrix)
- Field-level type mapping (PostgreSQL → TypeScript)
- Security features deep dive (price calculation, overlap prevention, denormalization)
- Index strategy with performance impact
- Constraints summary (PK, FK, unique, check, temporal)
- Triggers and automation explained
- TypeScript joined types
- Migration history

Best for:
- Comprehensive understanding of data model
- Code review and security audits
- Understanding why decisions were made
- Schema modifications

---

### 2. DATAMODEL_REFERENCE.md (545 lines, 15KB)
**Quick Reference - Developer-Focused**

What's inside:
- Table quick reference matrix
- Common query patterns (with TypeScript examples)
- Constraint values for validation
- Auto-calculated fields (total_price, slot_owner_id, updated_at)
- Nullability reference
- Type conversion guide (DB → TS)
- Access control reference (RLS overview)
- Foreign key cascade rules
- Temporal data patterns
- Status value lifecycles
- Error prevention patterns (price, double-booking, uniqueness)
- Index usage checklist
- Testing data models

Best for:
- Writing queries
- Integrating with TypeScript
- Testing
- Preventing common mistakes
- Quick lookup while coding

---

### 3. DATAMODEL_SCHEMA_VISUAL.md (532 lines, 28KB)
**Visual Reference - ASCII Diagrams**

What's inside:
- ASCII table structure diagrams (all 6 tables with field details)
- ER-style relationship diagram
- Index performance matrix
- Constraint hierarchy
- Trigger flow diagram (detailed step-by-step)
- Data type reference table
- Trigger flow on booking insert
- Trigger flow on any row update
- RLS policy matrix (table × operation)

Best for:
- Visual learners
- Understanding relationships at a glance
- Seeing trigger execution order
- Performance analysis
- Presentations

---

### 4. DATAMODEL_SUMMARY.txt (361 lines, 15KB)
**Executive Summary - High Level**

What's inside:
- Core findings (6 tables, 13 indexes, 4 triggers, RLS)
- Security features checklist
- Performance optimizations checklist
- Table inventory (3 business + 3 NextAuth)
- Index strategy overview
- Constraints summary
- Triggers automation list
- RLS policies quick matrix
- TypeScript type mapping
- Migration history
- Completeness checklist
- Key insights for developers
- Related files reference
- Quick links for common tasks

Best for:
- Onboarding new team members
- Executive briefings
- Quick reference while working
- Understanding what's documented

---

## Navigation by Topic

### Authentication & User Management
- **DATAMODEL_ANALYSIS.md** § USER_PROFILES table + NextAuth.js Tables
- **DATAMODEL_REFERENCE.md** § Access Control Reference
- **DATAMODEL_SCHEMA_VISUAL.md** § USER_PROFILES diagram

### Parking Slots (Marketplace)
- **DATAMODEL_ANALYSIS.md** § PARKING_SLOTS table + Index Strategy
- **DATAMODEL_REFERENCE.md** § Common Query Patterns (List Marketplace Slots)
- **DATAMODEL_SCHEMA_VISUAL.md** § PARKING_SLOTS diagram + idx_slots_listing

### Bookings (Core Business Logic)
- **DATAMODEL_ANALYSIS.md** § BOOKINGS table + Security Features + Triggers
- **DATAMODEL_REFERENCE.md** § Auto-Calculated Fields + Error Prevention Patterns
- **DATAMODEL_SCHEMA_VISUAL.md** § BOOKINGS diagram + Trigger Flow Diagram

### Performance & Optimization
- **DATAMODEL_ANALYSIS.md** § Index Strategy + Performance Characteristics
- **DATAMODEL_REFERENCE.md** § Index Usage Checklist + Performance Tuning Checklist
- **DATAMODEL_SCHEMA_VISUAL.md** § Index Performance Matrix

### Security & Data Isolation
- **DATAMODEL_ANALYSIS.md** § Security Features (3 subsections)
- **DATAMODEL_REFERENCE.md** § Error Prevention Patterns
- **DATAMODEL_SUMMARY.txt** § Security guarantees section

### Database Constraints
- **DATAMODEL_ANALYSIS.md** § Constraints Summary (all types)
- **DATAMODEL_REFERENCE.md** § Constraint Reference table
- **DATAMODEL_SCHEMA_VISUAL.md** § Constraint Hierarchy

### TypeScript Integration
- **DATAMODEL_ANALYSIS.md** § Field-Level Type Mapping + TypeScript Joined Types
- **DATAMODEL_REFERENCE.md** § Type Conversion Guide
- **DATAMODEL_SUMMARY.txt** § TypeScript Type Mapping

### Query Writing
- **DATAMODEL_REFERENCE.md** § Common Query Patterns (5 examples)
- **DATAMODEL_ANALYSIS.md** § Index Strategy (shows which queries use which indexes)
- **DATAMODEL_SCHEMA_VISUAL.md** § Index Performance Matrix

### Testing & Data Setup
- **DATAMODEL_REFERENCE.md** § Testing Data Models
- **DATAMODEL_REFERENCE.md** § Temporal Data Patterns (for 2026 dates)

### Row Level Security (RLS)
- **DATAMODEL_ANALYSIS.md** § All tables' RLS Policies sections
- **DATAMODEL_REFERENCE.md** § Access Control Reference
- **DATAMODEL_SCHEMA_VISUAL.md** § RLS Policy Matrix

---

## Topic-Based Reading Order

### New to ParkBoard?
1. **DATAMODEL_SUMMARY.txt** (5 min) - Get the lay of the land
2. **DATAMODEL_SCHEMA_VISUAL.md** § Table Structure Diagrams (10 min) - See the schema visually
3. **DATAMODEL_REFERENCE.md** - Bookmark for quick lookups
4. **DATAMODEL_ANALYSIS.md** - Deep dive sections as needed

### Implementing a New Feature?
1. **DATAMODEL_REFERENCE.md** § Common Query Patterns - See if similar exists
2. **DATAMODEL_REFERENCE.md** § Error Prevention Patterns - Avoid common mistakes
3. **DATAMODEL_ANALYSIS.md** § Relevant table section - Understand the fields
4. **DATAMODEL_SCHEMA_VISUAL.md** § Index Performance Matrix - Optimize from day 1

### Debugging a Data Issue?
1. **DATAMODEL_REFERENCE.md** § Auto-Calculated Fields - Not set by client
2. **DATAMODEL_REFERENCE.md** § Nullability Reference - Check allowed nulls
3. **DATAMODEL_ANALYSIS.md** § Triggers section - Understand automatic behavior
4. **DATAMODEL_SCHEMA_VISUAL.md** § Constraint Hierarchy - Check validation rules

### Security Review?
1. **DATAMODEL_ANALYSIS.md** § Security Features (all 5 subsections)
2. **DATAMODEL_REFERENCE.md** § Error Prevention Patterns
3. **DATAMODEL_ANALYSIS.md** § Row Level Security (RLS) section
4. **DATAMODEL_SCHEMA_VISUAL.md** § RLS Policy Matrix

### Performance Tuning?
1. **DATAMODEL_ANALYSIS.md** § Performance Characteristics
2. **DATAMODEL_SCHEMA_VISUAL.md** § Index Performance Matrix
3. **DATAMODEL_REFERENCE.md** § Index Usage Checklist
4. **DATAMODEL_ANALYSIS.md** § Index Strategy (detailed)

---

## Quick Reference - Common Questions

### "What fields does the booking table have?"
→ **DATAMODEL_SCHEMA_VISUAL.md** § BOOKINGS table diagram (see all fields in one place)

### "How do I fetch a user's bookings efficiently?"
→ **DATAMODEL_REFERENCE.md** § Get User's Bookings section

### "Why doesn't my total_price value save?"
→ **DATAMODEL_REFERENCE.md** § Auto-Calculated Fields section

### "Is this field nullable?"
→ **DATAMODEL_REFERENCE.md** § Nullability Reference

### "What are the valid status values?"
→ **DATAMODEL_REFERENCE.md** § Status Value Reference

### "How do I prevent overlapping bookings?"
→ **DATAMODEL_ANALYSIS.md** § Overlap Prevention (Race Condition Prevention)

### "Why is my query slow?"
→ **DATAMODEL_SCHEMA_VISUAL.md** § Index Performance Matrix
→ **DATAMODEL_REFERENCE.md** § Index Usage Checklist

### "What RLS policies protect my data?"
→ **DATAMODEL_SCHEMA_VISUAL.md** § RLS Policy Matrix
→ **DATAMODEL_ANALYSIS.md** § Row Level Security section

### "What happens when I delete a user?"
→ **DATAMODEL_REFERENCE.md** § Foreign Key Cascade Rules

### "How is price calculated?"
→ **DATAMODEL_REFERENCE.md** § Auto-Calculated Fields § total_price
→ **DATAMODEL_ANALYSIS.md** § Server-Side Price Calculation

---

## File Sizes & Scope

| File | Size | Lines | Focus | Audience |
|------|------|-------|-------|----------|
| DATAMODEL_SUMMARY.txt | 15KB | 361 | High-level overview | Managers, architects, quick ref |
| DATAMODEL_REFERENCE.md | 15KB | 545 | Developer quick ref | Developers building features |
| DATAMODEL_ANALYSIS.md | 26KB | 702 | Comprehensive deep dive | Architects, code reviewers, integrators |
| DATAMODEL_SCHEMA_VISUAL.md | 28KB | 532 | Visual diagrams | Visual learners, diagrams, presentations |
| **TOTAL** | **84KB** | **2,140** | **Complete data model** | **All roles** |

---

## Where to Find Specific Information

### Looking for a specific table?
Each table gets a dedicated section in:
- **DATAMODEL_ANALYSIS.md** (3-4 pages per table with all details)
- **DATAMODEL_SCHEMA_VISUAL.md** (ASCII box diagram with every field)

### Looking for performance info?
- **DATAMODEL_ANALYSIS.md** § Performance Characteristics
- **DATAMODEL_SCHEMA_VISUAL.md** § Index Performance Matrix
- **DATAMODEL_REFERENCE.md** § Index Usage Checklist + Performance Tuning Checklist

### Looking for security info?
- **DATAMODEL_ANALYSIS.md** § Security Features (5 subsections)
- **DATAMODEL_ANALYSIS.md** § Row Level Security (RLS)
- **DATAMODEL_REFERENCE.md** § Error Prevention Patterns

### Looking for TypeScript types?
- **DATAMODEL_ANALYSIS.md** § Field-Level Type Mapping
- **DATAMODEL_REFERENCE.md** § Type Conversion Guide
- `/types/database.ts` (actual TypeScript source)

### Looking for trigger behavior?
- **DATAMODEL_ANALYSIS.md** § Triggers and Automation
- **DATAMODEL_SCHEMA_VISUAL.md** § Trigger Flow Diagram

### Looking for RLS policies?
- **DATAMODEL_ANALYSIS.md** § Row Level Security (RLS) (each table's policies)
- **DATAMODEL_SCHEMA_VISUAL.md** § RLS Policy Matrix

### Looking for constraints?
- **DATAMODEL_ANALYSIS.md** § Constraints Summary
- **DATAMODEL_REFERENCE.md** § Constraint Reference
- **DATAMODEL_SCHEMA_VISUAL.md** § Constraint Hierarchy

### Looking for migration history?
- **DATAMODEL_ANALYSIS.md** § Migration History
- **DATAMODEL_SUMMARY.txt** § Migration History

---

## Using These Docs with the Codebase

### Primary Source of Truth
- `/db/schema_optimized.sql` - The actual SQL schema (300+ lines)

### TypeScript Integration
- `/types/database.ts` - TypeScript interfaces (mirrors this schema)
- `/lib/auth/auth.ts` - NextAuth.js configuration

### Query Examples
- `/app/api/` - API routes using these tables
- `/__tests__/` - Unit tests showing query patterns
- `/e2e/` - E2E tests using real data

### Deployment & Migration
- `/db/migrations/` - Idempotent migration scripts
- `/scripts/migrate.sh` - Migration runner

---

## Documentation Features

### Every Document Includes:
✓ Clear table of contents or section headers
✓ Consistent formatting for easy scanning
✓ Examples where applicable
✓ Cross-references between documents
✓ Warnings for common mistakes
✓ Performance impact notes
✓ Security considerations

### Each Table Documented With:
✓ Purpose statement
✓ Primary key details
✓ All columns (type, constraints, purpose)
✓ Indexes (with performance impact)
✓ Triggers (with effects)
✓ Relationships (FK, cardinality)
✓ RLS policies (with logic)
✓ TypeScript types

### Each Index Documented With:
✓ Query pattern (what it optimizes)
✓ Index type (B-tree, GIST, covering, composite)
✓ Performance impact (% faster)
✓ Columns and WHERE clause
✓ When to use

---

## Keeping These Docs in Sync

**When to update DATAMODEL docs:**
1. Schema changes in `/db/schema_optimized.sql`
2. New triggers added
3. New indexes created
4. RLS policies modified
5. TypeScript types updated in `/types/database.ts`

**How to update:**
1. Update source files first (`schema_optimized.sql`, `database.ts`)
2. Regenerate the analysis docs to match
3. Keep constraint/field descriptions in sync
4. Add notes about why changes were made

**Note:** These docs reflect schema as of migration 006 (2026-03-18)

---

## Related Documentation

- **CLAUDE.md** - Project overview and architecture
- `/docs/SECURITY_ARCHITECTURE.md` - Detailed security model
- **DATAMODEL_ANALYSIS.md** - This set of docs
- Migration scripts in `/db/migrations/`

---

## How to Cite These Docs

**In code comments:**
```typescript
// Booking total_price is auto-calculated by DB trigger
// See DATAMODEL_ANALYSIS.md § Server-Side Price Calculation
```

**In PRs/Issues:**
```
See DATAMODEL_REFERENCE.md § Auto-Calculated Fields
for why we don't set total_price from client
```

**In team discussions:**
```
According to DATAMODEL_SCHEMA_VISUAL.md § Index Performance Matrix,
idx_slots_listing provides 2-3x speedup for marketplace queries
```

---

## Document Navigation Map

```
START HERE
    ↓
Choose your role:
    ├─ Manager/Architect? → DATAMODEL_SUMMARY.txt (5 min)
    ├─ Developer? → DATAMODEL_REFERENCE.md (bookmark)
    ├─ Code Reviewer? → DATAMODEL_ANALYSIS.md (deep dive)
    └─ Visual Learner? → DATAMODEL_SCHEMA_VISUAL.md (diagrams)

Then bookmark all 4 for:
    ├─ Quick lookup while coding
    ├─ Design discussions
    ├─ Code reviews
    ├─ Performance optimization
    └─ Security audits
```

---

## Last Updated

- **Analysis Generated:** 2026-03-18
- **Schema Version:** 2.0 (Production-ready with optimizations)
- **Migration Level:** 006 (NextAuth tables included)
- **Documentation Completeness:** 100% (all tables, indexes, triggers, RLS)

---

**📚 All 4 documentation files are ready to use. Start with the guide for your role above.**
