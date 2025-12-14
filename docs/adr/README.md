# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for ParkBoard. ADRs document significant architectural decisions, their context, consequences, and alternatives considered.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./001-hardcoded-community-routes.md) | Hardcoded Community Routes for MVP | Accepted | 2025-12-14 |

## ADR Status Definitions

- **Proposed** - Under discussion, not yet implemented
- **Accepted** - Decision approved and implemented
- **Deprecated** - No longer relevant, superseded by another ADR
- **Superseded** - Replaced by a newer ADR (reference provided)

## How to Use ADRs

### When to Create an ADR

Create an ADR when making decisions that:
- Affect the overall architecture or system design
- Have significant long-term implications
- Involve trade-offs between competing approaches
- Impact multiple components or systems
- Require justification for future reference

### ADR Template

See `001-hardcoded-community-routes.md` for the standard ADR structure:

1. **Title** - ADR-XXX: [Decision Title]
2. **Revision Log** - Track document changes
3. **Context** - Problem statement and background
4. **Decision** - What we decided and why
5. **Consequences** - Benefits, tradeoffs, and operational implications
6. **Implementation** - Concrete steps or code examples
7. **Related Decisions** - Links to other ADRs (Depends on, Extends, Constrains, Implements, Supersedes)
8. **Future Considerations** - Evolution paths and migration plans
9. **Appendices** - Supporting details (optional)

### Creating a New ADR

1. **Determine ADR number** - Use next sequential number (ADR-002, ADR-003, etc.)
2. **Create file** - `docs/adr/XXX-short-title.md`
3. **Follow template structure** - See existing ADRs for format
4. **Add to index** - Update this README.md with new ADR entry
5. **Link related ADRs** - Use standard relationship types (Depends on, Extends, etc.)

## Related Documentation

- **`docs/SECURITY_ARCHITECTURE.md`** - Security model and tenant isolation
- **`docs/MULTI_TENANCY_IMPLEMENTATION_SUMMARY.md`** - Multi-tenant architecture overview
- **`CLAUDE.md`** - Project conventions and development guidelines
- **`db/schema_optimized.sql`** - Database schema (single source of truth)
