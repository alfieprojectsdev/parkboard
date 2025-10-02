# Toast Notification System - Migration Guide

## Overview

This guide explains how to replace blocking `throw new Error` calls with non-blocking toast notifications for a better user experience.

## What Changed?

### Before (Blocking)
```typescript
if (!data) {
  throw new Error("Data not found");  // ❌ Blocks execution, breaks UI
}
```

### After (Non-blocking)
```typescript
if (!data) {
  showError("Data not found");  // ✅ Shows toast, continues gracefully
  return;
}
```

## Benefits

1. **Non-blocking**: User can continue interacting with the app
2. **Better UX**: Smooth animations, auto-dismiss, stackable notifications
3. **Consistent**: Same notification style across the entire app
4. **Flexible**: Multiple types (error, success, warning, info)
5. **Actionable**: Can include action buttons

## Installation Steps

### 1. Component is already created
The `ToastNotification.tsx` component is in `/components/common/ToastNotification.tsx`

### 2. Animations added to CSS
Already added to `/app/globals.css`

### 3. Provider added to layout
Already added to `/app/layout.tsx`

## Usage

### Import the hook
```typescript
import { useToast } from '@/components/common/ToastNotification';

function MyComponent() {
  const { showError, showSuccess, showWarning, showInfo } = useToast();

  // Use in your component...
}
```

### Basic Examples

#### Error Notification
```typescript
// Replace this:
throw new Error("Booking failed");

// With this:
showError("Booking failed");
return;
```

#### Success Notification
```typescript
showSuccess("Booking created successfully!");
```

#### Warning Notification
```typescript
showWarning("Please select a parking slot");
```

#### Info Notification
```typescript
showInfo("Your session will expire in 5 minutes");
```

### Advanced Usage

#### With Custom Title
```typescript
showError("Network connection lost", "Connection Error");
```

#### With Action Button
```typescript
const { showToast } = useToast();

showToast({
  type: 'error',
  title: 'Booking Failed',
  message: 'Slot is already booked',
  duration: 7000,
  action: {
    label: 'View Available Slots',
    onClick: () => router.push('/slots')
  }
});
```

#### With Custom Duration
```typescript
showToast({
  type: 'success',
  message: 'Settings saved',
  duration: 2000  // 2 seconds
});
```

## Migration Patterns

### Pattern 1: Validation Errors

**Before:**
```typescript
if (!email) {
  throw new Error("Email is required");
}
```

**After:**
```typescript
if (!email) {
  showWarning("Please enter your email address");
  return false;
}
```

### Pattern 2: API Errors

**Before:**
```typescript
try {
  const res = await fetch('/api/bookings', { ... });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message);
  }
} catch (err) {
  alert(err.message);  // or throw
}
```

**After:**
```typescript
try {
  const res = await fetch('/api/bookings', { ... });
  if (!res.ok) {
    const error = await res.json();
    showError(error.message || 'Booking failed');
    return;
  }
  showSuccess('Booking confirmed!');
} catch (err) {
  showError(err.message || 'An unexpected error occurred');
}
```

### Pattern 3: Permission Errors

**Before:**
```typescript
if (slot.owner_id && slot.owner_id !== userId) {
  throw new Error("This slot is reserved for another resident");
}
```

**After:**
```typescript
if (slot.owner_id && slot.owner_id !== userId) {
  showWarning("This slot is reserved for another resident. Please select a different slot.");
  return;
}
```

### Pattern 4: Context Errors (Keep as is)

**Do NOT change these:**
```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthWrapper');  // ✅ Keep this
  }
  return context;
}
```

**Why?** These are developer errors, not user errors. They should break during development to help catch bugs.

## Files to Migrate

### High Priority (User-facing)
1. ✅ `components/booking/BookingForm.tsx` → `.improved.tsx` created
2. ✅ `components/booking/UserBookingsList.tsx` → `.improved.tsx` created
3. `components/booking/TimeRangePicker.tsx`
4. `app/login/page.tsx`
5. `app/reset-password/page.tsx`

### Medium Priority
6. `components/auth/AuthWrapper.tsx` (session errors only)
7. Admin components in `app/admin/`

### Low Priority (Developer errors - keep as is)
- Hook validation errors (useAuth, useToast, etc.)
- Environment variable checks
- Build-time errors

## Testing Checklist

After migrating a component:

- [ ] Errors show as toast notifications
- [ ] Success messages show as green toasts
- [ ] Warnings show as yellow toasts
- [ ] Toasts auto-dismiss after appropriate time
- [ ] Multiple toasts stack properly
- [ ] User can manually dismiss toasts
- [ ] App continues to function after error
- [ ] No console errors
- [ ] Mobile responsive (toasts appear correctly)

## Example: Complete Migration

**Original `BookingForm.tsx` (lines 89-97):**
```typescript
if (!res.ok) {
  let errorMessage = 'Booking failed';
  try {
    const errorData = await res.json();
    errorMessage = errorData.error || errorMessage;
  } catch {
    errorMessage = `Booking failed: ${res.status} ${res.statusText}`;
  }
  throw new Error(errorMessage);  // ❌ Blocking
}
```

**Improved `BookingForm.improved.tsx`:**
```typescript
if (!res.ok) {
  let errorMessage = 'Booking failed';
  try {
    const errorData = await res.json();
    errorMessage = errorData.error || errorMessage;
  } catch {
    errorMessage = `Booking failed: ${res.status} ${res.statusText}`;
  }
  showError(errorMessage);  // ✅ Non-blocking
  return;
}
```

## Toast Types Reference

| Type | Use Case | Color | Default Duration |
|------|----------|-------|------------------|
| `error` | Failed operations, server errors | Red | 7000ms |
| `success` | Successful operations | Green | 4000ms |
| `warning` | Validation issues, permissions | Yellow | 5000ms |
| `info` | Informational messages | Blue | 4000ms |

## Best Practices

1. **Be specific**: "Slot A-101 is already booked" > "Booking failed"
2. **Be actionable**: Tell users what to do next
3. **Use appropriate type**:
   - `error` for failures
   - `warning` for validation/permissions
   - `success` for completion
   - `info` for FYI messages
4. **Keep it short**: 1-2 sentences max
5. **Match tone**: Professional but friendly
6. **Provide context**: Include relevant details (slot number, time, etc.)

## Common Mistakes to Avoid

❌ **Don't**: Remove error handling
```typescript
// Bad
const data = await fetchData();
// No error check!
```

✅ **Do**: Handle errors gracefully
```typescript
// Good
try {
  const data = await fetchData();
  showSuccess('Data loaded');
} catch (err) {
  showError('Failed to load data');
}
```

❌ **Don't**: Show generic messages
```typescript
showError('Error');  // What error?
```

✅ **Do**: Be specific
```typescript
showError('Failed to cancel booking: It has already started');
```

❌ **Don't**: Use toasts for developer errors
```typescript
if (!process.env.API_KEY) {
  showError('API key missing');  // User can't fix this!
}
```

✅ **Do**: Throw developer errors
```typescript
if (!process.env.API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

## Next Steps

1. Review the `.improved.tsx` files
2. Test the toast system in your local environment
3. Migrate one component at a time
4. Test thoroughly after each migration
5. Replace original files once confirmed working
6. Update other components following the same patterns

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify `ToastProvider` is in the layout
3. Ensure animations are in `globals.css`
4. Check that `useToast` is called inside a component (not at module level)

## Configuration

### Adjust Max Visible Toasts
```typescript
// In app/layout.tsx
<ToastProvider maxToasts={5}>  {/* Default is 3 */}
  {children}
</ToastProvider>
```

### Adjust Default Durations
```typescript
// In ToastNotification.tsx, modify these lines:
const showError = useCallback((message: string, title?: string) => {
  showToast({ type: 'error', message, title: title || 'Error', duration: 10000 }); // 10 seconds
}, [showToast]);
```

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Status**: Ready for Implementation