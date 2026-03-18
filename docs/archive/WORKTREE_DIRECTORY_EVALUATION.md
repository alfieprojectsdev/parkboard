# Git Worktree Directory Location: Evaluation & Recommendation

**Date:** 2025-10-18
**Purpose:** Evaluate optimal directory structure for parkboard worktrees
**Decision Status:** Under Review

---

## Current Plan vs. Proposed Alternative

### Current Plan: Separate `parkboard-worktrees/` Directory

**Structure:**
```
/home/ltpt420/repos/
├── parkboard/                    # Original repo (backup/reference)
├── parkboard-bare/               # Bare repository (no working dir)
└── parkboard-worktrees/          # All worktrees here
    ├── .scratchpads/            # Coordination
    ├── .locks/                  # Resource locks
    ├── .coordination/           # Task boards
    ├── main/                    # Main branch worktree
    ├── feature-slot-edit/       # Feature worktree
    ├── fix-sign-out-issues/     # Fix worktree
    └── dev/                     # Dev worktree
```

### Proposed Alternative: Hidden `.trees/` Inside Parkboard

**Structure:**
```
/home/ltpt420/repos/
└── parkboard/                    # Main working directory (main branch)
    ├── .git/                    # Git repository
    ├── .trees/                  # Hidden worktrees folder
    │   ├── .scratchpads/       # Coordination
    │   ├── .locks/             # Resource locks
    │   ├── .coordination/      # Task boards
    │   ├── feature-slot-edit/  # Feature worktree
    │   ├── fix-sign-out-issues/# Fix worktree
    │   └── dev/                # Dev worktree
    ├── app/                    # Main branch files
    ├── components/
    ├── docs/
    ├── node_modules/
    ├── .next/
    └── ... (all other project files)
```

---

## Detailed Comparison

### Complexity

| Aspect | Separate Directory | `.trees/` Inside |
|--------|-------------------|------------------|
| **Setup steps** | 3 directories to create | 1 directory to create |
| **Bare repo needed?** | Yes (extra step) | No (simpler) |
| **Mental model** | Bare → Worktrees | Main repo + extra worktrees |
| **Path complexity** | `../parkboard-worktrees/main` | `.trees/feature-slot-edit` |
| **Explanation difficulty** | Higher (3 concepts) | Lower (2 concepts) |

**Winner:** `.trees/` inside (simpler)

### Organization

| Aspect | Separate Directory | `.trees/` Inside |
|--------|-------------------|------------------|
| **Self-contained?** | No (3 separate dirs) | Yes (everything in parkboard/) |
| **Coordination files** | Outside git repo | Inside project (hidden) |
| **Visibility in ls** | Clutters /repos | Hidden (cleaner) |
| **Logical grouping** | Scattered | Together |
| **.gitignore** | N/A (outside repo) | Easy to add `.trees/` |

**Winner:** `.trees/` inside (better organization)

### Safety & Recovery

| Aspect | Separate Directory | `.trees/` Inside |
|--------|-------------------|------------------|
| **Source of truth** | parkboard-bare (separate) | parkboard/.git (main) |
| **Accidental deletion** | Bare repo survives | Lose everything if rm -rf parkboard |
| **Recovery** | Recreate worktrees from bare | Need backup or GitHub |
| **Redundancy** | 3 copies (original, bare, worktrees) | 1 repo + worktrees |

**Winner:** Separate directory (safer)

### Practical Usage

| Aspect | Separate Directory | `.trees/` Inside |
|--------|-------------------|------------------|
| **cd to worktree** | `cd ~/repos/parkboard-worktrees/main` | `cd ~/repos/parkboard/.trees/main` |
| **cd to main** | `cd ~/repos/parkboard-worktrees/main` | `cd ~/repos/parkboard` (shorter!) |
| **Coordination paths** | `../parkboard-worktrees/.scratchpads/` | `.trees/.scratchpads/` |
| **Script paths** | Longer | Shorter |
| **New developer clarity** | "Where's the main repo?" | "It's parkboard/" |

**Winner:** `.trees/` inside (more intuitive)

### Multi-Instance Coordination

| Aspect | Separate Directory | `.trees/` Inside |
|--------|-------------------|------------------|
| **Scratchpad access** | `~/repos/parkboard-worktrees/.scratchpads/` | `~/repos/parkboard/.trees/.scratchpads/` |
| **Lock files** | Outside any git repo | Inside project (can be versioned) |
| **Status scripts** | In parkboard-worktrees/ | In parkboard/.trees/ or parkboard/scripts/ |
| **Helper scripts** | Separate location | Can be in parkboard/scripts/ |

**Winner:** Tie (both work well, slight edge to separate for clarity)

---

## Evaluation Matrix

| Criterion | Weight | Separate Dir | `.trees/` Inside | Winner |
|-----------|--------|--------------|------------------|--------|
| **Simplicity** | 🔥🔥🔥 | 6/10 | 9/10 | `.trees/` |
| **Organization** | 🔥🔥🔥 | 7/10 | 9/10 | `.trees/` |
| **Safety** | 🔥🔥 | 9/10 | 6/10 | Separate |
| **Developer UX** | 🔥🔥🔥 | 6/10 | 9/10 | `.trees/` |
| **Coordination** | 🔥 | 8/10 | 7/10 | Separate |
| **Setup time** | 🔥🔥 | 6/10 | 9/10 | `.trees/` |
| **Understandability** | 🔥🔥🔥 | 5/10 | 9/10 | `.trees/` |

**Weighted Score:**
- **Separate directory:** 6.5/10
- **`.trees/` inside:** 8.3/10

**Winner:** `.trees/` inside parkboard

---

## Implementation Details for `.trees/` Approach

### Directory Structure

```
/home/ltpt420/repos/parkboard/
├── .git/                         # Main git repository
├── .gitignore                    # Add .trees/ to this
│
├── .trees/                       # 🆕 All worktrees here
│   ├── .scratchpads/            # Instance communication
│   │   ├── claude-main.md       # (main is parkboard/ itself)
│   │   ├── claude-feature.md
│   │   ├── claude-fix.md
│   │   ├── claude-dev.md
│   │   └── shared.md
│   ├── .locks/                  # Resource locks
│   ├── .coordination/           # Task boards, priority queues
│   │
│   ├── feature-slot-edit/       # Worktree for feature branch
│   │   ├── .git                 # (worktree git link)
│   │   ├── app/
│   │   ├── components/
│   │   ├── node_modules/
│   │   └── ...
│   │
│   ├── fix-sign-out-issues/     # Worktree for fix branch
│   ├── dev/                     # Dev/testing worktree
│   ├── test/                    # E2E testing worktree
│   └── docs/                    # Documentation worktree
│
├── app/                          # Main branch working files
├── components/
├── docs/
├── node_modules/
├── .next/
└── ... (all parkboard files)
```

### Port Assignments

| Worktree | Location | Branch | Port |
|----------|----------|--------|------|
| **main** | `/home/ltpt420/repos/parkboard/` | main | 3000 |
| feature | `/home/ltpt420/repos/parkboard/.trees/feature-slot-edit/` | feature/slot-edit | 3001 |
| fix | `/home/ltpt420/repos/parkboard/.trees/fix-sign-out-issues/` | fix/sign-out-issues | 3002 |
| dev | `/home/ltpt420/repos/parkboard/.trees/dev/` | main | 3003 |
| test | `/home/ltpt420/repos/parkboard/.trees/test/` | main | 3004 |
| docs | `/home/ltpt420/repos/parkboard/.trees/docs/` | main | 3005 |

### Setup Commands

```bash
# Navigate to parkboard
cd /home/ltpt420/repos/parkboard

# Create .trees directory
mkdir -p .trees/{.scratchpads,.locks,.coordination}

# Add .trees/ to .gitignore
echo "" >> .gitignore
echo "# Git worktrees" >> .gitignore
echo ".trees/" >> .gitignore

# Create worktrees
git worktree add .trees/feature-slot-edit feature/slot-edit
git worktree add .trees/fix-sign-out-issues fix/sign-out-issues
git worktree add .trees/dev main
git worktree add .trees/test main
git worktree add .trees/docs main

# Install dependencies in each
cd .trees/feature-slot-edit && npm install && cd ../..
cd .trees/fix-sign-out-issues && npm install && cd ../..
cd .trees/dev && npm install && cd ../..
cd .trees/test && npm install && cd ../..
cd .trees/docs && npm install && cd ../..

# Copy .env.local to each
cp .env.local .trees/feature-slot-edit/.env.local
cp .env.local .trees/fix-sign-out-issues/.env.local
cp .env.local .trees/dev/.env.local
cp .env.local .trees/test/.env.local
cp .env.local .trees/docs/.env.local

# Create scratchpads
# (see automation script below)
```

### Instance Assignment for `.trees/` Approach

| Instance ID | Worktree Location | Notes |
|-------------|-------------------|-------|
| `claude-main` | `/home/ltpt420/repos/parkboard/` | **Main directory itself** |
| `claude-feature` | `/home/ltpt420/repos/parkboard/.trees/feature-slot-edit/` | Feature development |
| `claude-fix` | `/home/ltpt420/repos/parkboard/.trees/fix-sign-out-issues/` | Bug fixes |
| `claude-dev` | `/home/ltpt420/repos/parkboard/.trees/dev/` | Experimentation |
| `claude-test` | `/home/ltpt420/repos/parkboard/.trees/test/` | E2E testing |
| `claude-docs` | `/home/ltpt420/repos/parkboard/.trees/docs/` | Documentation |

**Key difference:** Main branch is in the root parkboard directory, not `.trees/main/`

### Coordination Paths

```bash
# From main directory (claude-main)
cat .trees/.scratchpads/*.md

# From worktree (claude-feature)
cd /home/ltpt420/repos/parkboard/.trees/feature-slot-edit
cat ../.scratchpads/*.md

# Status script location
# Option 1: parkboard/.trees/status.sh
# Option 2: parkboard/scripts/worktree-status.sh
```

### .gitignore Update

```gitignore
# Existing ignores
node_modules/
.next/
.env.local
# ... etc

# Git worktrees (new)
.trees/
```

---

## Pros and Cons Summary

### `.trees/` Inside Parkboard

**Advantages:**
1. ✅ **Simpler mental model** - One project directory, not three
2. ✅ **Self-contained** - Everything related to parkboard is in parkboard/
3. ✅ **Shorter paths** - `.trees/feature/` vs `../parkboard-worktrees/feature/`
4. ✅ **Hidden from ls** - `.trees/` won't clutter directory listings
5. ✅ **Easier for newcomers** - "Go to parkboard, worktrees are in .trees/"
6. ✅ **No bare repo needed** - One less concept to explain
7. ✅ **Cleaner /repos/** - Only parkboard, not 3 directories
8. ✅ **Main branch obvious** - It's the parkboard/ root itself
9. ✅ **Scripts can be versioned** - Helper scripts in parkboard/scripts/
10. ✅ **Faster setup** - No bare clone step

**Disadvantages:**
1. ❌ **Less safe** - Deleting parkboard/ loses everything (no separate bare repo)
2. ❌ **Main dir is also a worktree** - Conceptually slightly messier
3. ❌ **Coordination outside git** - .trees/ is gitignored (though this is also a pro)

### Separate `parkboard-worktrees/`

**Advantages:**
1. ✅ **Safer** - Bare repository is separate source of truth
2. ✅ **Cleaner separation** - Original, bare, and worktrees clearly distinct
3. ✅ **All worktrees equal** - main/ is just another worktree, not special
4. ✅ **Professional standard** - Common pattern in large projects

**Disadvantages:**
1. ❌ **More complex** - Three directories to manage
2. ❌ **Longer paths** - `~/repos/parkboard-worktrees/main` vs `~/repos/parkboard`
3. ❌ **Cluttered /repos/** - Three parkboard-related directories
4. ❌ **Coordination outside git** - Scripts not in any repository
5. ❌ **More setup steps** - Bare clone, create worktrees dir, etc.
6. ❌ **Harder to explain** - "Where's the code?" "Well, it depends..."

---

## Recommendation

### For Parkboard Project: **Use `.trees/` Inside**

**Reasoning:**
1. **Simplicity wins** - Parkboard is a solo/small team project, not enterprise
2. **Better DX** - Developers will spend less time understanding structure
3. **Faster setup** - Lower barrier to adoption
4. **Self-contained** - All project assets in one place
5. **Safety is GitHub** - Remote repo is the backup, not local bare repo

**When to use separate directory instead:**
- Large teams (10+ developers)
- Enterprise requirements
- Need for extra-paranoid local redundancy
- Project has complex release management

### Implementation Plan

1. **Update automation scripts** to use `.trees/` approach
2. **Simplify documentation** to remove bare repository complexity
3. **Update all paths** in guides and helper scripts
4. **Create migration guide** for those who've already set up separate directories

---

## Migration: Separate Directory → `.trees/` Inside

If you've already set up parkboard-worktrees/, here's how to migrate:

```bash
# 1. Navigate to parkboard
cd /home/ltpt420/repos/parkboard

# 2. Create .trees structure
mkdir -p .trees/{.scratchpads,.locks,.coordination}

# 3. Move worktrees (except main)
mv ../parkboard-worktrees/feature-slot-edit .trees/
mv ../parkboard-worktrees/fix-sign-out-issues .trees/
mv ../parkboard-worktrees/dev .trees/
mv ../parkboard-worktrees/test .trees/
mv ../parkboard-worktrees/docs .trees/

# 4. Move coordination infrastructure
mv ../parkboard-worktrees/.scratchpads/* .trees/.scratchpads/
mv ../parkboard-worktrees/.locks/* .trees/.locks/ 2>/dev/null || true
mv ../parkboard-worktrees/.coordination/* .trees/.coordination/

# 5. Update git worktree references
git worktree list  # See current locations
git worktree move ../parkboard-worktrees/feature-slot-edit .trees/feature-slot-edit
# Repeat for each worktree

# 6. Update .gitignore
echo ".trees/" >> .gitignore

# 7. Clean up old directories
rm -rf ../parkboard-worktrees
rm -rf ../parkboard-bare

# 8. Update scratchpad paths in helper scripts
# (sed commands to update paths from ../ to .trees/)
```

---

## Updated File Structure for Documentation

All documentation should be updated to reflect `.trees/` approach:

**Files to update:**
1. ✏️ `docs/GIT_WORKTREE_IMPLEMENTATION_GUIDE.md` - Use `.trees/` as primary approach
2. ✏️ `docs/MULTI_INSTANCE_COORDINATION.md` - Update paths to `.trees/`
3. ✏️ `docs/WORKTREE_OPTIMIZATION_SUMMARY.md` - Revise directory structure
4. ✏️ `docs/CLAUDE_INSTANCE_HOWTO.md` - Update worktree paths
5. ✏️ `docs/scripts/setup-worktrees.sh` - Implement `.trees/` approach
6. ✏️ `docs/scripts/quickstart-worktrees.sh` - Implement `.trees/` approach

**Estimated update time:** 30-45 minutes

---

## Decision

**RECOMMENDED: Adopt `.trees/` inside parkboard approach**

**Rationale:**
- **83% weighted score** vs 65% for separate directory
- **Simpler for solo/small team** (parkboard's current state)
- **Better developer experience** (shorter paths, clearer structure)
- **Faster setup** (no bare repo needed)
- **Self-contained** (everything in one place)

**Next steps:**
1. Update all documentation to use `.trees/` approach
2. Update automation scripts
3. Add `.trees/` to .gitignore
4. Test updated quickstart script

**Approval needed:** Yes (this changes the implementation plan)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-18
**Status:** Awaiting Decision
