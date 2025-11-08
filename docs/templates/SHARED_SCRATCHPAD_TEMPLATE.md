# Shared Coordination Scratchpad

**Purpose:** Cross-instance announcements, alerts, and coordination
**Last Updated:** [YYYY-MM-DD HH:MM:SS]

> **All instances MUST read this file before starting work and check every 5 minutes for URGENT alerts**

---

## 🚨 Active Alerts

<!-- Post urgent, time-sensitive information here -->

### [PRIORITY] [YYYY-MM-DD HH:MM] - [Title]

**Posted by:** [instance-id]
**Expires:** [YYYY-MM-DD HH:MM]
**Message:** [Alert message]
**Action Required:** [What should other instances do?]
**Status:** [ACTIVE | RESOLVED]

<!-- Example:
### URGENT [2025-10-18 10:30] - Database Migration in Progress

**Posted by:** claude-main
**Expires:** 2025-10-18 10:45
**Message:** Running migration 004. Do not perform any database operations.
**Action Required:** Pause all DB-dependent work until 10:45
**Status:** ACTIVE
-->

**No active alerts**

---

## 📋 Task Assignments

| Task | Assigned To | Status | Priority | Due Date | Notes |
|------|-------------|--------|----------|----------|-------|
| Deploy to Vercel | claude-main | BLOCKED | P0 | 2025-10-19 | Waiting for Vercel account |
| Hybrid pricing UI | claude-feature | IN_PROGRESS | P1 | 2025-10-18 | 60% complete |
| E2E test updates | claude-test | PENDING | P2 | 2025-10-19 | Blocked by UI completion |
| Documentation | claude-docs | IN_PROGRESS | P2 | 2025-10-19 | |

<!-- Keep this table updated as tasks progress -->

---

## 📊 Current Sprint Status

**Sprint:** [Sprint name/number]
**Duration:** [Start date] to [End date]
**Goal:** [Sprint objective]

**Progress:**
- ✅ [Completed items]
- 🔄 [In progress items]
- ⏸️ [Blocked items]
- 📝 [Pending items]

---

## 🎯 Today's Priorities

**Date:** [YYYY-MM-DD]

### Must Complete Today
1. [Task 1]
2. [Task 2]
3. [Task 3]

### Should Complete Today
1. [Task 1]
2. [Task 2]

### Nice to Have
1. [Task 1]
2. [Task 2]

---

## 💬 General Announcements

<!-- Non-urgent information sharing -->

### [YYYY-MM-DD HH:MM] - [Title]
**Posted by:** [instance-id]
**Message:** [Announcement]

<!-- Example:
### 2025-10-18 09:00 - New Testing Pattern Established

**Posted by:** claude-test
**Message:** I've created a new diagnostic testing pattern in e2e/debug-template.spec.ts.
All instances should use this for debugging instead of manual browser inspection.
See docs/E2E_TEST_PLAN_20251012.md for details.
-->

**No announcements**

---

## 🔄 Coordinated Operations

<!-- For operations requiring multiple instances -->

### [Operation Name]

**Coordinator:** [instance-id]
**Participants:** [list of instances]
**Scheduled:** [YYYY-MM-DD HH:MM]
**Status:** [PLANNING | READY | IN_PROGRESS | COMPLETED]

**Timeline:**
- [HH:MM] - [Action by instance]
- [HH:MM] - [Action by instance]

**Prerequisites:**
- [ ] [Requirement 1]
- [ ] [Requirement 2]

**Rollback Plan:**
[What to do if operation fails]

---

## 📝 Recent Decisions

<!-- Log important technical and process decisions -->

**[YYYY-MM-DD]** - [Decision title]
- **Decision:** [What was decided]
- **Rationale:** [Why this decision was made]
- **Impact:** [Who/what is affected]
- **Decided by:** [instance-id or consensus]

<!-- Example:
**2025-10-18** - Use bare repository for worktrees

- **Decision:** Adopt bare repository approach for git worktrees
- **Rationale:** Better isolation, cleaner structure, easier to manage
- **Impact:** All instances will need to migrate to new directory structure
- **Decided by:** Consensus (claude-main, claude-feature, claude-docs)
-->

---

## 🔒 Resource Locks

<!-- Global view of all locked resources -->

| Resource | Locked By | Locked At | Reason | ETA Release |
|----------|-----------|-----------|--------|-------------|
| Database | - | - | - | - |
| package.json | - | - | - | - |
| .env.local | - | - | - | - |

<!-- Update this when acquiring/releasing locks -->

---

## 🐛 Known Issues

<!-- Track bugs and issues affecting multiple instances -->

### [SEVERITY] [Issue Title]

**Reported by:** [instance-id]
**Reported at:** [YYYY-MM-DD HH:MM]
**Affects:** [What/who is affected]
**Workaround:** [Temporary solution if any]
**Status:** [OPEN | INVESTIGATING | IN_PROGRESS | RESOLVED]
**Assigned to:** [instance-id]

<!-- Example:
### HIGH - Infinite spinner on /LMR/slots page

**Reported by:** claude-main
**Reported at:** 2025-10-18 09:00
**Affects:** All community slot pages
**Workaround:** Use /slots route instead (non-community specific)
**Status:** RESOLVED
**Assigned to:** claude-fix
**Resolution:** Fixed useEffect dependencies in CommunityContext.tsx
-->

**No known issues**

---

## 📈 Metrics Dashboard

**As of:** [YYYY-MM-DD HH:MM]

### Instance Activity
- Active instances: [count]
- Idle instances: [count]
- Blocked instances: [count]

### Code Metrics
- Commits today: [count]
- Tests passing: [count/total]
- Build status: [SUCCESS | FAILING]
- Lint status: [CLEAN | WARNINGS | ERRORS]

### Progress Metrics
- Tasks completed this week: [count]
- Tasks in progress: [count]
- Tasks blocked: [count]

---

## 🔔 Notifications

<!-- System-generated or automated notifications -->

**[YYYY-MM-DD HH:MM]** - [Notification message]

---

## 📚 Important Links

- **Main Guide:** `/docs/GIT_WORKTREE_IMPLEMENTATION_GUIDE.md`
- **Coordination Guide:** `/docs/MULTI_INSTANCE_COORDINATION.md`
- **Setup Script:** `/docs/scripts/setup-worktrees.sh`
- **Project Docs:** `/docs/`
- **CLAUDE.md:** `/CLAUDE.md`

---

## 🛠️ Quick Commands Reference

```bash
# Check all instance status
cat parkboard-worktrees/.scratchpads/*.md | grep "State:"

# Check for alerts
grep -A 5 "URGENT" parkboard-worktrees/.scratchpads/shared.md

# Check locks
ls -la parkboard-worktrees/.locks/

# Check port usage
lsof -ti:3000,3001,3002,3003,3004,3005

# Sync all worktrees
./sync-all-worktrees.sh
```

---

## 📅 Upcoming Milestones

| Date | Milestone | Status | Owner |
|------|-----------|--------|-------|
| 2025-10-19 | Deploy to staging | PENDING | claude-main |
| 2025-10-20 | Production deployment | PENDING | claude-main |
| 2025-10-21 | UI/UX improvements | PENDING | TBD |

---

## 💡 Best Practices Reminder

✅ **DO:**
- Read this file before starting work
- Update your scratchpad every 15 minutes
- Respond to messages within 10 minutes
- Acquire locks before sensitive operations
- Commit frequently with clear messages

❌ **DON'T:**
- Ignore URGENT alerts
- Work on locked resources
- Push directly to main
- Share worktrees between instances
- Leave stale locks

---

## 🆘 Emergency Contacts

**Human Developer:** [contact info if applicable]
**Project Lead:** [contact info]
**On-Call Instance:** [instance-id currently on-call]

---

## Template Version

**Version:** 1.0
**Last Modified:** 2025-10-18
**Maintained By:** All instances (collective responsibility)

---

## Changelog

**2025-10-18** - Template created
