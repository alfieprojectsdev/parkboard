# Instance Scratchpad: [INSTANCE-ID]

**Worktree:** [worktree-name]
**Port:** [port-number]
**Started:** [YYYY-MM-DD HH:MM:SS]
**Last Updated:** [YYYY-MM-DD HH:MM:SS]

> **Usage:** Copy this template to `parkboard-worktrees/.scratchpads/[instance-id].md`
> Update the Last Updated timestamp every time you modify this file.

---

## Current Status

**State:** IDLE
<!-- States: IDLE | WORKING | BLOCKED | COMPLETED | ERROR -->

**Working On:** Nothing currently

**Estimated Completion:** N/A

**Progress:** 0%

---

## Current Task

### Objective

None

### Detailed Description

None

### Progress Checklist

- [ ] Task not yet started

### Blockers

None

---

## Messages to Other Instances

<!-- Format:
### To: [instance-id] | ALL
**Priority:** [LOW | MEDIUM | HIGH | URGENT]
**Timestamp:** [YYYY-MM-DD HH:MM:SS]
**Message:** [your message]
**Status:** [SENT | ACKNOWLEDGED | RESOLVED]
-->

No messages

---

## Messages Received

<!-- When you receive a message directed at you, copy it here and mark status -->

<!-- Example:
### From: claude-main
**Priority:** HIGH
**Timestamp:** 2025-10-18 10:30:00
**Message:** Please review migration 004 before deployment
**Status:** ACKNOWLEDGED
**Response:** Reviewed. Looks good. +1 for deployment.
-->

No messages received

---

## Recent Commits

<!-- Format: `commit-hash` - commit message -->

None yet

---

## Resources Currently Locked

**Database:** NO
**Migrations Pending:** NO

**Files Being Edited:**
- None

**Other Locks:**
- None

---

## Work Log

<!-- Chronological log of significant activities -->

**[YYYY-MM-DD HH:MM:SS]** - Instance initialized

---

## Notes & Observations

<!-- Any important context, discoveries, or observations -->

None

---

## Handoff Information

<!-- If you need to hand off work to another instance or human developer -->

**Handoff Required:** NO

**Handoff To:** N/A

**Handoff Reason:** N/A

**Handoff Details:**
- None

---

## Error Log

<!-- Record any errors encountered -->

No errors

---

## Performance Metrics

**Tests Run:** 0
**Tests Passed:** 0
**Tests Failed:** 0

**Build Status:** Not built

**Lint Status:** Not checked

---

## Dependencies & Waiting On

<!-- What are you waiting for from other instances or external factors? -->

- None

---

## Quick Status (for monitoring scripts)

```json
{
  "instance_id": "[INSTANCE-ID]",
  "state": "IDLE",
  "task": "None",
  "progress": 0,
  "blockers": 0,
  "port": [port-number],
  "last_updated": "[timestamp]",
  "health": "OK"
}
```

---

## Template Version

**Version:** 1.0
**Last Modified:** 2025-10-18
