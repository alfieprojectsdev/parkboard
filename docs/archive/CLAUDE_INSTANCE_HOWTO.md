# How to Run Multiple Claude Instances with Worktrees

**Date:** 2025-10-18
**Purpose:** Practical guide for parallel Claude Code instance execution
**Audience:** Human operators launching multiple Claude instances

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Launching Instances](#launching-instances)
5. [Instance Prompts](#instance-prompts)
6. [Monitoring Instances](#monitoring-instances)
7. [Coordination Examples](#coordination-examples)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide shows you how to run **multiple Claude Code instances in parallel**, each working in its own worktree, communicating via scratchpads, and coordinating to avoid conflicts.

### Use Cases

**When to use multiple instances:**
- ✅ Implementing multiple independent features simultaneously
- ✅ Bug fix while feature development continues
- ✅ Documentation updates while coding
- ✅ Testing while development continues
- ✅ Code review + implementation in parallel

**When NOT to use multiple instances:**
- ❌ Single linear task
- ❌ Highly interdependent changes
- ❌ Learning/experimenting (use single instance)

---

## Prerequisites

### 1. Run Worktree Setup

First, set up the worktree infrastructure:

```bash
cd /home/ltpt420/repos/parkboard/docs/scripts
chmod +x quickstart-worktrees.sh
./quickstart-worktrees.sh
```

This creates:
- Bare repository
- 6 worktrees (main, feature, fix, dev, test, docs)
- Coordination infrastructure
- Helper scripts

**Time:** 10-15 minutes

### 2. Verify Setup

```bash
cd /home/ltpt420/repos/parkboard-worktrees
./status.sh
```

You should see all worktrees listed with IDLE status.

---

## Initial Setup

### Step 1: Prepare Instance Assignments

Decide which instance does what:

| Instance | Worktree | Port | Task |
|----------|----------|------|------|
| Claude #1 | main | 3000 | Production testing |
| Claude #2 | feature-slot-edit | 3001 | Implement hybrid pricing UI |
| Claude #3 | fix-sign-out-issues | 3002 | Fix sign-out redirect bug |
| Claude #4 | test | 3004 | E2E tests for new features |

### Step 2: Open Multiple Terminal Windows/Tabs

You'll need:
- **1 terminal per instance** for Claude interaction
- **1 terminal for monitoring** (optional but recommended)

**Setup:**
```bash
# Terminal 1: Claude instance #1 (main)
cd /home/ltpt420/repos/parkboard/.trees/main

# Terminal 2: Claude instance #2 (feature)
cd /home/ltpt420/repos/parkboard/.trees/feature-slot-edit

# Terminal 3: Claude instance #3 (fix)
cd /home/ltpt420/repos/parkboard/.trees/fix-sign-out-issues

# Terminal 4: Claude instance #4 (test)
cd /home/ltpt420/repos/parkboard/.trees/test

# Terminal 5: Monitoring
cd /home/ltpt420/repos/parkboard-worktrees
watch -n 30 ./status.sh
```

---

## Launching Instances

### Method 1: Launch Claude Code in Each Worktree

In each terminal:

```bash
# Terminal 1 (main)
cd /home/ltpt420/repos/parkboard/.trees/main
claude

# Terminal 2 (feature)
cd /home/ltpt420/repos/parkboard/.trees/feature-slot-edit
claude

# And so on...
```

### Method 2: Using Screen/Tmux (Advanced)

```bash
# Create a tmux session with multiple panes
tmux new-session -s parkboard

# Split into panes (Ctrl+B then %)
# Navigate panes (Ctrl+B then arrow keys)
# In each pane, cd to worktree and launch claude
```

---

## Instance Prompts

### Initial Prompt for Each Instance

Give each Claude instance this initialization prompt:

#### Claude Instance #1 (main - Production Testing)

```
You are Claude instance "claude-main" working on the Parkboard project.

WORKSPACE:
- Worktree: /home/ltpt420/repos/parkboard/.trees/main
- Branch: main
- Port: 3000
- Your scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/claude-main.md
- Shared scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/shared.md

YOUR ROLE:
- Production testing and validation
- Coordination of multi-instance activities
- Final deployment preparation

BEFORE STARTING WORK:
1. Read ALL scratchpads: cat ../.scratchpads/*.md
2. Check for conflicts: ../check-conflicts.sh
3. Update your scratchpad status to WORKING
4. Read the shared scratchpad for alerts

DURING WORK:
- Update your scratchpad every 15 minutes
- Check for messages every 5 minutes
- Announce major changes in shared scratchpad
- Acquire locks before database operations

COORDINATION PROTOCOL:
See /home/ltpt420/repos/parkboard/docs/MULTI_INSTANCE_COORDINATION.md

CURRENT TASK:
Test the production build and prepare for deployment to Vercel.

Ready? First, read all scratchpads and check for conflicts.
```

#### Claude Instance #2 (feature - Hybrid Pricing UI)

```
You are Claude instance "claude-feature" working on the Parkboard project.

WORKSPACE:
- Worktree: /home/ltpt420/repos/parkboard/.trees/feature-slot-edit
- Branch: feature/slot-edit
- Port: 3001
- Your scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/claude-feature.md
- Shared scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/shared.md

YOUR ROLE:
- Feature development (hybrid pricing UI)
- Component implementation
- Unit test creation

BEFORE STARTING WORK:
1. Read ALL scratchpads: cat ../.scratchpads/*.md
2. Check for conflicts: ../check-conflicts.sh
3. Update your scratchpad status to WORKING
4. Read the shared scratchpad for alerts

DURING WORK:
- Update your scratchpad every 15 minutes
- Check for messages every 5 minutes
- List files you're editing in your scratchpad
- Commit frequently with clear messages

COORDINATION PROTOCOL:
See /home/ltpt420/repos/parkboard/docs/MULTI_INSTANCE_COORDINATION.md

CURRENT TASK:
Implement the hybrid pricing UI as specified in
/home/ltpt420/repos/parkboard/docs/HYBRID_PRICING_IMPLEMENTATION_20251013.md

Focus on:
1. Create slot form (pricing type selector)
2. Slot listing display (conditional price rendering)
3. Slot detail page ("Contact Owner" UI)
4. Unit tests for new components

Ready? First, read all scratchpads and check for conflicts.
```

#### Claude Instance #3 (fix - Bug Fixes)

```
You are Claude instance "claude-fix" working on the Parkboard project.

WORKSPACE:
- Worktree: /home/ltpt420/repos/parkboard/.trees/fix-sign-out-issues
- Branch: fix/sign-out-issues
- Port: 3002
- Your scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/claude-fix.md
- Shared scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/shared.md

YOUR ROLE:
- Bug fixes and hotfixes
- Issue resolution
- Regression testing

BEFORE STARTING WORK:
1. Read ALL scratchpads: cat ../.scratchpads/*.md
2. Check for conflicts: ../check-conflicts.sh
3. Update your scratchpad status to WORKING
4. Read the shared scratchpad for alerts

COORDINATION PROTOCOL:
See /home/ltpt420/repos/parkboard/docs/MULTI_INSTANCE_COORDINATION.md

CURRENT TASK:
Fix the sign-out redirect issue where users are not properly redirected
to the login page after signing out.

Steps:
1. Reproduce the issue
2. Identify root cause (likely in middleware.ts or Navigation.tsx)
3. Implement fix
4. Add regression test
5. Verify fix works

Ready? First, read all scratchpads and check for conflicts.
```

#### Claude Instance #4 (test - E2E Testing)

```
You are Claude instance "claude-test" working on the Parkboard project.

WORKSPACE:
- Worktree: /home/ltpt420/repos/parkboard/.trees/test
- Branch: main
- Port: 3004
- Your scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/claude-test.md
- Shared scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/shared.md

YOUR ROLE:
- E2E test development
- QA and validation
- Test automation

BEFORE STARTING WORK:
1. Read ALL scratchpads: cat ../.scratchpads/*.md
2. Check for conflicts: ../check-conflicts.sh
3. Update your scratchpad status to WORKING
4. Read the shared scratchpad for alerts

COORDINATION PROTOCOL:
See /home/ltpt420/repos/parkboard/docs/MULTI_INSTANCE_COORDINATION.md

CURRENT TASK:
Wait for claude-feature to complete hybrid pricing UI, then create E2E
tests for the new functionality.

Monitor claude-feature's scratchpad for completion notification.

When ready:
1. Pull changes from feature/slot-edit
2. Create E2E tests for hybrid pricing
3. Run full test suite
4. Report results in shared scratchpad

Ready? First, read all scratchpads and monitor for feature completion.
```

---

## Monitoring Instances

### Dashboard Script

Create a monitoring dashboard:

```bash
cd /home/ltpt420/repos/parkboard-worktrees

# Watch mode (updates every 30 seconds)
watch -n 30 ./status.sh

# Or run periodically
while true; do
  clear
  ./status.sh
  echo ""
  echo "Checking for conflicts..."
  ./check-conflicts.sh || echo ""
  echo ""
  echo "Last updated: $(date)"
  sleep 30
done
```

### What to Monitor

**Check every 5-10 minutes:**
- ✅ Instance status (WORKING, IDLE, BLOCKED, ERROR)
- ✅ Active locks (database, files)
- ✅ Urgent messages in shared scratchpad
- ✅ Port conflicts
- ✅ Completion notifications

**Red flags:**
- 🚩 Instance stuck in WORKING for >1 hour without update
- 🚩 Multiple instances trying to lock same resource
- 🚩 URGENT messages not acknowledged
- 🚩 Instance status ERROR
- 🚩 Multiple instances editing same file

---

## Coordination Examples

### Example 1: Sequential Handoff (Feature → Test)

**Claude #2 (feature) - When Feature Complete:**

Update your scratchpad:
```markdown
## Current Status

**State:** COMPLETED
**Working On:** Hybrid pricing UI implementation - COMPLETE

## Messages to Other Instances

### To: claude-test
**Priority:** HIGH
**Timestamp:** 2025-10-18 14:30:00
**Message:** Hybrid pricing UI feature complete and pushed to origin/feature/slot-edit.
Ready for E2E testing.

Changes include:
- app/[community]/slots/new/page.tsx (pricing type selector)
- components/slots/SlotCard.tsx (conditional price display)
- components/slots/SlotDetail.tsx (Contact Owner UI)

Tests needed:
1. Create slot with NULL price
2. Verify "Contact Owner" button shown
3. Verify instant booking disabled for NULL price slots

Branch: feature/slot-edit
Commit: abc123def
```

**Claude #4 (test) - Response:**

Update your scratchpad:
```markdown
## Current Status

**State:** WORKING
**Working On:** E2E tests for hybrid pricing (handoff from claude-feature)

## Messages to Other Instances

### To: claude-feature
**Priority:** MEDIUM
**Timestamp:** 2025-10-18 14:35:00
**Message:** Received. Pulling feature/slot-edit and starting E2E tests.
ETA: 45 minutes.
```

### Example 2: Parallel Work with Coordination

**Scenario:** Claude #2 working on UI, Claude #3 fixing bug, both need to edit Navigation.tsx

**Claude #2 (feature):**
```markdown
## Resources Currently Locked

**Files Being Edited:**
- app/[community]/slots/new/page.tsx (editing)
- components/slots/SlotCard.tsx (editing)
- components/common/Navigation.tsx (need to edit - CONFLICT!)

## Messages to Other Instances

### To: claude-fix
**Priority:** HIGH
**Timestamp:** 2025-10-18 10:15:00
**Message:** I see you're editing Navigation.tsx. I also need to update it
to add a new menu item for pricing settings. Can you finish your changes
first, or should I proceed and we'll merge later?
```

**Claude #3 (fix):**
```markdown
### To: claude-feature
**Priority:** HIGH
**Timestamp:** 2025-10-18 10:18:00
**Message:** I'm nearly done (5 min). Please wait - I'll commit and notify you.
```

**Claude #3 (fix) - 5 minutes later:**
```markdown
### To: claude-feature
**Priority:** MEDIUM
**Timestamp:** 2025-10-18 10:23:00
**Message:** Done! Navigation.tsx committed. You can pull and continue.
Commit: xyz789abc
```

### Example 3: Emergency Stop

**Claude #1 (main) discovers critical bug:**

Update shared scratchpad:
```markdown
## 🚨 Active Alerts

### URGENT [2025-10-18 11:00] - Critical Bug in Booking System

**Posted by:** claude-main
**Expires:** Until resolved
**Message:** Found critical bug in slot booking - users can double-book slots.
DO NOT deploy anything related to bookings.

**Action Required:**
- ❌ ALL instances: STOP work on booking-related features
- ❌ DO NOT deploy to production
- ❌ DO NOT run database migrations
- ✅ claude-fix: Investigate ASAP
- ✅ All others: Review your recent booking code for similar issues

**Status:** INVESTIGATING
```

**All instances acknowledge in their scratchpads:**
```markdown
### From: claude-main
**Priority:** URGENT
**Timestamp:** 2025-10-18 11:00:00
**Message:** Critical bug in booking system
**Status:** ACKNOWLEDGED
**Response:** Stopping all booking-related work. Standing by.
```

---

## Troubleshooting

### Issue: Instance Not Responding

**Symptoms:**
- Scratchpad not updated for >30 minutes
- Instance status stuck in WORKING

**Diagnosis:**
```bash
# Check if dev server is running
lsof -ti:3001

# Check recent commits
cd /home/ltpt420/repos/parkboard/.trees/feature-slot-edit
git log --oneline -5

# Check for errors
cat .scratchpads/claude-feature.md | grep -i error
```

**Solutions:**
1. Manually update scratchpad to reflect current state
2. Check Claude instance for errors/prompts
3. If stuck, mark as BLOCKED and describe issue
4. Reassign task to another instance if needed

### Issue: Port Conflict

**Symptoms:**
- Error: "Port already in use"

**Diagnosis:**
```bash
# Find what's using the port
lsof -ti:3001
ps aux | grep <PID>
```

**Solutions:**
```bash
# Option 1: Kill the process
lsof -ti:3001 | xargs kill -9

# Option 2: Use different port
npm run dev -- -p 3011

# Option 3: Update scratchpad with new port
```

### Issue: Merge Conflict from Parallel Work

**Prevention:**
- Use scratchpad "Files Being Edited" section
- Coordinate before editing shared files
- Pull frequently

**Resolution:**
```bash
# In affected worktree
git fetch --all
git merge origin/main

# Resolve conflicts
# Claude instance should handle this with Edit tool

git add .
git commit -m "chore: resolve merge conflicts"
git push
```

### Issue: Stale Lock

**Symptoms:**
- Lock file exists but instance is IDLE or gone

**Diagnosis:**
```bash
cat .locks/database.lock
# Check locked_by instance
cat .scratchpads/claude-main.md
# If instance is IDLE, lock is stale
```

**Solution:**
```bash
../release-lock.sh database
```

---

## Best Practices

### For Human Operators

✅ **DO:**
- Launch instances with clear, specific tasks
- Monitor shared scratchpad for alerts
- Intervene if instances are stuck or conflicting
- Provide clarification when asked
- Update task board as work progresses

❌ **DON'T:**
- Launch too many instances (max 4-6 recommended)
- Give overlapping tasks without coordination
- Ignore URGENT alerts
- Let instances run unsupervised for hours
- Interrupt coordinated operations

### For Claude Instances

✅ **DO:**
- Read scratchpads FIRST, before any work
- Update your scratchpad every 15 minutes
- Respond to messages promptly
- Announce breaking changes
- Clean up locks when done

❌ **DON'T:**
- Ignore other instances' messages
- Work on files someone else is editing
- Push to main without coordination
- Leave stale locks
- Assume others know what you're doing

---

## Example Session Workflow

### Complete 2-Hour Session with 3 Instances

**Time: 10:00 - Setup (10 min)**

Human operator:
```bash
# Terminal 1: Monitor
cd /home/ltpt420/repos/parkboard-worktrees
watch -n 30 ./status.sh

# Terminal 2: Claude #1 (main)
cd /home/ltpt420/repos/parkboard/.trees/main
claude
# Paste initialization prompt for claude-main

# Terminal 3: Claude #2 (feature)
cd /home/ltpt420/repos/parkboard/.trees/feature-slot-edit
claude
# Paste initialization prompt for claude-feature

# Terminal 4: Claude #3 (test)
cd /home/ltpt420/repos/parkboard/.trees/test
claude
# Paste initialization prompt for claude-test
```

**Time: 10:10 - Work Begins**

All instances:
1. Read scratchpads
2. Check conflicts
3. Update status to WORKING
4. Begin assigned tasks

**Time: 10:25 - First Check-in**

Monitor shows:
- claude-main: WORKING (testing build)
- claude-feature: WORKING (implementing UI)
- claude-test: IDLE (waiting for feature)

**Time: 11:00 - Feature Complete**

claude-feature:
- Updates scratchpad to COMPLETED
- Notifies claude-test
- Commits and pushes

**Time: 11:05 - Handoff**

claude-test:
- Acknowledges handoff
- Pulls feature branch
- Updates status to WORKING
- Begins E2E tests

**Time: 11:30 - Tests Complete**

claude-test:
- Updates scratchpad to COMPLETED
- Reports results in shared scratchpad

**Time: 11:35 - Integration**

claude-main:
- Reviews all work
- Merges feature branch
- Runs final tests
- Updates task board

**Time: 12:00 - Session Complete**

All instances:
- Update scratchpads to IDLE
- Release all locks
- Final commits pushed

Human operator:
- Review task board
- Archive completed tasks
- Plan next session

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│ BEFORE LAUNCHING INSTANCES                              │
├─────────────────────────────────────────────────────────┤
│ 1. Run quickstart-worktrees.sh (if not done)            │
│ 2. Plan task assignments                                │
│ 3. Open terminals for each instance + monitor           │
│ 4. Prepare initialization prompts                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ LAUNCHING INSTANCES                                     │
├─────────────────────────────────────────────────────────┤
│ 1. cd to worktree directory                             │
│ 2. Launch claude                                        │
│ 3. Paste initialization prompt                          │
│ 4. Instance reads scratchpads                           │
│ 5. Instance begins work                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ MONITORING (every 5-10 min)                             │
├─────────────────────────────────────────────────────────┤
│ - Check status.sh output                                │
│ - Read shared scratchpad for alerts                     │
│ - Verify no stuck instances                             │
│ - Check for URGENT messages                             │
│ - Look for conflicts                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ WHEN ISSUES OCCUR                                       │
├─────────────────────────────────────────────────────────┤
│ - Read instance scratchpad for context                  │
│ - Check other instances for conflicts                   │
│ - Provide clarification to blocked instance             │
│ - Manually release stale locks if needed                │
│ - Reassign tasks if instance stuck                      │
└─────────────────────────────────────────────────────────┘
```

---

## Appendix: Prompt Templates

### Generic Instance Initialization Template

```
You are Claude instance "<INSTANCE-ID>" working on the Parkboard project.

WORKSPACE:
- Worktree: /home/ltpt420/repos/parkboard/.trees/<WORKTREE-NAME>
- Branch: <BRANCH-NAME>
- Port: <PORT-NUMBER>
- Your scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/<INSTANCE-ID>.md
- Shared scratchpad: /home/ltpt420/repos/parkboard/.trees/.scratchpads/shared.md

YOUR ROLE:
<ROLE-DESCRIPTION>

BEFORE STARTING WORK:
1. Read ALL scratchpads: cat ../.scratchpads/*.md
2. Check for conflicts: ../check-conflicts.sh
3. Update your scratchpad status to WORKING
4. Read the shared scratchpad for alerts

DURING WORK:
- Update your scratchpad every 15 minutes
- Check for messages every 5 minutes
- Announce major changes in shared scratchpad
- List files you're editing in your scratchpad

COORDINATION PROTOCOL:
See /home/ltpt420/repos/parkboard/docs/MULTI_INSTANCE_COORDINATION.md

CURRENT TASK:
<TASK-DESCRIPTION>

Ready? First, read all scratchpads and check for conflicts.
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-18
**Author:** Multi-Instance Coordination Team
**Status:** Production-Ready

## Next Steps

1. Run `quickstart-worktrees.sh` if not done
2. Choose your instances and tasks
3. Launch instances with initialization prompts
4. Monitor progress via `status.sh`
5. Review results and iterate

Happy parallel coding! 🚀
