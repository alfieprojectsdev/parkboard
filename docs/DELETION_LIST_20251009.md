# ParkBoard - Files for Deletion

**Generated:** 2025-10-07
**Purpose:** Clean up repository to minimum required files for MVP

---

## 🔴 DELETE IMMEDIATELY

### 1. Test Files (Not Needed in Production)

```bash
rm app/test/page.tsx
```

**Reason:** This is a test page created during development. Not needed for production.

---

## ✅ ALREADY HANDLED (No Action Needed)

### Sensitive Files (Protected by .gitignore)

These files exist locally but are **NOT tracked in git** (verified):

- `.env.local` - Environment variables (secrets)
- `tsconfig.tsbuildinfo` - TypeScript build cache
- `lib/client_secret_*.json` - OAuth secrets

**Status:** ✅ Already in `.gitignore`, not in repository

---

## 🟡 CONSIDER ARCHIVING (Optional)

### Old Documentation Files

Move to `docs/archive/` folder for reference:

```bash
mkdir -p docs/archive
mv docs/address_TODOs_20251006-144111.md docs/archive/
mv docs/authentication_20251006-142644.md docs/archive/
mv docs/brainstorm_20251006-151320.md docs/archive/
mv docs/optimizations_20251006-142644.md docs/archive/
mv docs/parkboard_claude_context_2025-10-04_172204.md docs/archive/
mv docs/ParkBoard_SelfGuidedRebuildPlan_20251006_065702.md docs/archive/
```

**Keep these documentation files:**
- `docs/pseudocode_20251007-090752.md` - Implementation reference
- `docs/tests_20251007-090752.md` - Test specifications
- `docs/singleSignOn_20251007-094338.md` - OAuth setup guide
- `docs/middleware_implementation.md` - Middleware docs
- `docs/middleware_quick_reference.md` - Quick reference
- `docs/AUDIT_REPORT_20251007.md` - This audit
- `docs/AUDIT_SUMMARY.md` - Quick summary
- `README.md` - Project readme

---

## 📦 DATABASE FILES

### Use This Schema:
- ✅ `db/schema_optimized.sql` - **USE THIS** (latest, optimized)

### Archive This:
- 🟡 `db/schema_refined.sql` - Outdated, keep for reference only

```bash
# Optional: Rename for clarity
mv db/schema_refined.sql db/schema_refined.sql.old
```

---

## 🚫 DO NOT DELETE

### Critical Application Files (Keep All)

**Routes:**
- `app/page.tsx` - Landing page (needs customization)
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(marketplace)/slots/page.tsx`
- `app/(marketplace)/slots/[slotId]/page.tsx`
- `app/(marketplace)/slots/new/page.tsx`
- `app/(marketplace)/bookings/page.tsx`
- `app/auth/callback/route.ts`
- `app/api/auth/signup/route.ts`
- `app/profile/complete/page.tsx`

**Components:**
- `components/auth/AuthWrapper.tsx`
- `components/common/Navigation.tsx`
- `components/common/ErrorDisplay.tsx`
- `components/ui/*` - All shadcn/ui components

**Configuration:**
- `middleware.ts` - Auth protection
- `next.config.mjs`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `.eslintrc.json`
- `package.json`
- `package-lock.json`
- `components.json`

**Library Code:**
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `lib/utils.ts`

**Types:**
- `types/database.ts`

**Testing:**
- `jest.config.js`
- `jest.setup.js`
- `__tests__/**/*` - All test files

**Assets:**
- `app/fonts/*`
- `app/favicon.ico`
- `app/globals.css`
- `app/layout.tsx`

---

## 📝 Deletion Commands

### Execute These Commands:

```bash
# 1. Delete test page
rm app/test/page.tsx

# 2. (Optional) Archive old docs
mkdir -p docs/archive
mv docs/address_TODOs_20251006-144111.md docs/archive/
mv docs/authentication_20251006-142644.md docs/archive/
mv docs/brainstorm_20251006-151320.md docs/archive/
mv docs/optimizations_20251006-142644.md docs/archive/
mv docs/parkboard_claude_context_2025-10-04_172204.md docs/archive/
mv docs/ParkBoard_SelfGuidedRebuildPlan_20251006_065702.md docs/archive/

# 3. (Optional) Mark old schema as archived
mv db/schema_refined.sql db/schema_refined.sql.old

# 4. Verify no sensitive files in git
git ls-files | grep -E "(\.env|client_secret|tsbuildinfo)"
# Should return nothing

# 5. Clean build artifacts (safe to run anytime)
rm -rf .next
rm -rf node_modules/.cache
```

---

## ✅ Verification Checklist

After deletion, verify:

- [ ] `app/test/page.tsx` removed
- [ ] Old docs archived (optional)
- [ ] No `.env.local` in git history
- [ ] No `client_secret*.json` in git history
- [ ] Application still runs: `npm run dev`
- [ ] Tests still run: `npm test`
- [ ] Build succeeds: `npm run build`

---

## 📊 Repository Size

**Before Cleanup:**
- Files: ~50
- Critical: ~35
- Test/Docs: ~15

**After Cleanup:**
- Files: ~49 (only 1 deleted)
- Critical: ~35
- Test/Docs: ~14

**Disk Space Saved:** Minimal (old docs are small)

---

## 🎯 Summary

**REQUIRED DELETIONS:**
1. `app/test/page.tsx` ← **DELETE THIS**

**OPTIONAL ARCHIVING:**
2. Old documentation (6 files) ← Move to `docs/archive/`
3. Old schema ← Rename to `.old`

**PROTECTED (DO NOT DELETE):**
- All application code
- All configuration files
- All test files
- All current documentation

**ALREADY SAFE:**
- Sensitive files are in `.gitignore`
- Not tracked in git repository

---

*End of deletion list*
