# v2 rewrite of `parkboard` 

### Phase 1: Excavation and Pruning
Before writing new code, you need to distill the actual business logic from the noise of the legacy implementation.

**1. Invoke `skills/codebase-analysis` + `skills/deepthink`**
* **Action:** Direct the harness to analyze the `app/db/migrations/`, `types/database.ts`, and the core `docs/API_DESIGN.md` files.
* **Objective:** Extract the pure data models, the hybrid pricing logic, and the multi-tenant community requirements.
* **Directive:** Have `deepthink` map out the existing Supabase/NextAuth authentication flow, which appears to have required extensive troubleshooting in the past (evidenced by multiple middleware and auth audit docs).

### Phase 2: Specification and Architecture
With the core logic extracted, establish the guardrails for v2.

**2. Load `agents/architect.md` + `skills/planner`**
* **Action:** Feed the extracted schema and business requirements to the Architect agent to generate a fresh `PLAN.md` and necessary Architecture Decision Records (ADRs).
* **Objective:** Prioritize a spec-driven, minimalist architecture. The goal is to reduce cognitive load by stripping away overly complex client-side UI states in favor of clean, static server components (React 19 / Next.js 14 App Router) where possible.
* **Directive:** Define strict database-level constraints and validation schemas upfront before any application logic is drafted.

**3. Invoke `skills/decision-critic`**
* **Action:** Have the critic review the Architect's proposed middleware routing and authentication state management to ensure the phantom session issues from v1 are structurally prevented in v2.

### Phase 3: Iterative Implementation
Rebuild the platform using strict boundaries.

**4. Load `agents/developer.md` + `skills/refactor`**
* **Action:** Execute the `PLAN.md` sequentially. Start with the foundational database connections and schema types, then move to the auth middleware, and finally the routing and UI.
* **Execution Strategy:** When running these local language model executions and AST refactoring scripts, keep the task scope strictly bounded to single domains (e.g., "Implement the slot booking mutation"). Processing the rewrite in isolated, bite-sized modules will ensure the tooling remains highly responsive and avoids memory bottlenecks on a ThinkPad T420.

### Phase 4: Verification and Hardening
Ensure the execution matches the specification.

**5. Load `agents/quality-reviewer.md` + `skills/problem-analysis`**
* **Action:** After each major domain is implemented (Auth, Booking, Admin Dashboard), run the Quality Reviewer.
* **Objective:** Verify that the code adheres to the defined data contracts and that the Playwright E2E tests properly validate the system's behavior boundaries. If the reviewer flags issues with rate-limiting or concurrent bookings, use `problem-analysis` to trace the execution path.

### Phase 5: Documentation Synchronization
Clean up the repository's historical baggage.

**6. Load `agents/technical-writer.md` + `skills/doc-sync`**
* **Action:** Command the Technical Writer to purge the dozens of obsolete `SESSION_SUMMARY`, `AUDIT_REPORT`, and timestamped scratchpads currently in the `docs/` folder.
* **Objective:** Use `doc-sync` to generate a unified, single-source-of-truth documentation structure that reflects the clean v2 architecture, maintaining only what is absolutely necessary for future maintenance.
