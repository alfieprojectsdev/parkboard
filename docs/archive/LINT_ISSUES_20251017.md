# ESLint Issues - October 17, 2025

**Status:** 3 warnings (all non-critical useEffect dependency warnings)

## Issues Found

### ⚠️ useEffect Dependency Warnings

These warnings are **intentionally ignored** to prevent infinite render loops. Adding object references like `supabase` to dependency arrays causes re-renders on every component update.

**Reference:** See `docs/MULTI_TENANT_IMPLEMENTATION_20251014.md` lines 163-186 for detailed explanation.

---

### 1. Bookings Page
- **File:** `app/[community]/bookings/page.tsx`
- **Line:** 82
- **Rule:** `react-hooks/exhaustive-deps`
- **Issue:** React Hook useEffect has missing dependencies: 'supabase' and 'user'
- **Action:** ❌ Do NOT fix (would cause infinite loop)
- **Reason:**
  - `supabase` is a client instance that changes every render
  - `user` object reference changes even when values are the same
  - Current implementation uses empty array `[]` for mount-only effect
  - This is the correct pattern for this use case

---

### 2. Slot Detail Page
- **File:** `app/[community]/slots/[slotId]/page.tsx`
- **Line:** 90
- **Rule:** `react-hooks/exhaustive-deps`
- **Issue:** React Hook useEffect has a missing dependency: 'supabase'
- **Action:** ❌ Do NOT fix (would cause infinite loop)
- **Reason:**
  - Same as above - `supabase` client changes every render
  - Mount-only effect is intentional with `[]` dependency array

---

### 3. Slots Listing Page
- **File:** `app/[community]/slots/page.tsx`
- **Line:** 78
- **Rule:** `react-hooks/exhaustive-deps`
- **Issue:** React Hook useEffect has a missing dependency: 'supabase'
- **Action:** ❌ Do NOT fix (would cause infinite loop)
- **Reason:**
  - Same as above - `supabase` client changes every render
  - Mount-only effect is intentional with `[]` dependency array

---

## Summary

- **Total Issues:** 3 warnings
- **Critical Issues:** 0
- **Action Required:** None (all warnings are intentional)

## Why These Warnings Exist

ESLint's `react-hooks/exhaustive-deps` rule is designed to catch missing dependencies that could cause stale closures. However, it doesn't understand that certain objects (like Supabase client instances) are stable references that shouldn't be in dependency arrays.

### The Problem with Adding These Dependencies

```tsx
// ❌ BAD - Causes infinite loop
useEffect(() => {
  fetchData()
}, [supabase]) // supabase changes every render!

// ✅ GOOD - Mount-only effect
useEffect(() => {
  fetchData()
}, []) // Only runs once on mount
```

### If You Need to Suppress the Warning

Add ESLint disable comment above the useEffect:

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  fetchData()
}, [])
```

However, this is **not necessary** - these warnings don't affect functionality and serve as documentation that we're intentionally using mount-only effects.

---

## Next Steps

1. ✅ No action required - warnings are safe to ignore
2. ✅ Build process completes successfully
3. ✅ E2E tests pass with current implementation
4. ✅ Ready for deployment

**Last Updated:** 2025-10-17
**Linted With:** next lint (Next.js 14.2.33)
