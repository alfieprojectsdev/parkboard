# 🗺️ ParkBoard URL to Source File Mapping

Complete mapping of all URLs to their source files for easy debugging and navigation.

---

## 📱 **PUBLIC ROUTES** (No authentication required)

| URL | Source File | Description | Status |
|-----|-------------|-------------|--------|
| `/` | `app/page.tsx` | Landing page / Home | ✅ Existing |
| `/login` | `app/login/page.tsx` | Login form | ✅ Existing |
| `/register` | `app/register/page.tsx` | Registration form | ✅ Existing |
| `/signup` | `app/signup/page.tsx` | Alt signup page (if exists) | ⚠️ Check if duplicate |

---

## 🔐 **AUTHENTICATED ROUTES** (Require login)

### **Core User Routes**

| URL | Source File | Description | User Type | Status |
|-----|-------------|-------------|-----------|--------|
| `/dashboard` | `app/dashboard/page.tsx` | Smart router: redirects based on user type | All | ✅ Existing (Update needed) |
| `/profile` | `app/profile/page.tsx` | User profile settings | All | ⚠️ Check if exists |
| `/fix-profile` | `app/fix-profile/page.tsx` | Profile repair utility | All | ✅ Existing |

---

### **Onboarding Routes**

| URL | Source File | Description | User Type | Status |
|-----|-------------|-------------|-----------|--------|
| `/onboarding` | `app/onboarding/page.tsx` | "Do you own a slot?" selection | New users | ✅ Created (Marketplace) |

---

### **Booking Routes** (Renters)

| URL | Source File | Description | User Type | Status |
|-----|-------------|-------------|-----------|--------|
| `/bookings` | `app/bookings/page.tsx` | View my bookings list | Renters | ✅ Existing |
| `/bookings/new` | `app/bookings/new/page.tsx` | Create new booking | Renters | ✅ Existing |
| `/bookings/[bookingId]` | `app/bookings/[bookingId]/page.tsx` | View booking details | Renters | ⚠️ Check if exists |

---

### **Marketplace Routes** (All Users - Browse & Rent)

| URL | Source File | Description | User Type | Status |
|-----|-------------|-------------|-----------|--------|
| `/marketplace` | `app/marketplace/page.tsx` | Browse available slots | All | ✅ Created (Marketplace) |
| `/marketplace/[slotId]` | `app/marketplace/[slotId]/page.tsx` | Slot detail + booking form | All | ✅ Created (Marketplace) |

---

### **Owner Routes** (Slot Owners Only)

| URL | Source File | Description | User Type | Status |
|-----|-------------|-------------|-----------|--------|
| `/owner` | `app/owner/page.tsx` | Owner dashboard - manage slots | Owners | ✅ Created (Marketplace) |
| `/owner/setup` | `app/owner/setup/page.tsx` | List your first slot | Owners | ✅ Created (Marketplace) |
| `/owner/earnings` | `app/owner/earnings/page.tsx` | Revenue tracking & payouts | Owners | ✅ Created (Marketplace) |
| `/owner/settings` | `app/owner/settings/page.tsx` | Rental preferences & rules | Owners | ✅ Created (Marketplace) |
| `/owner/slots/[slotId]/edit` | `app/owner/slots/[slotId]/edit/page.tsx` | Edit slot details | Owners | ✅ Created (Marketplace) |

---

### **Admin Routes** (Admins Only)

| URL | Source File | Description | User Type | Status |
|-----|-------------|-------------|-----------|--------|
| `/admin` | `app/admin/page.tsx` | Admin dashboard overview | Admins | ✅ Existing |
| `/admin/slots` | `app/admin/slots/page.tsx` | Manage all parking slots | Admins | ✅ Existing |
| `/admin/users` | `app/admin/users/page.tsx` | Manage user accounts | Admins | ✅ Existing |
| `/admin/bookings` | `app/admin/bookings/page.tsx` | View all bookings | Admins | ⚠️ Check if exists |

---

### **Donations Routes** (If applicable)

| URL | Source File | Description | User Type | Status |
|-----|-------------|-------------|-----------|--------|
| `/donations` | `app/donations/page.tsx` | View/create donations | All | ⚠️ Check if exists |

---

## 🧩 **SHARED COMPONENTS** (Not URLs, but important sources)

### **Navigation & Layout**

| Component | Source File | Used By | Purpose |
|-----------|-------------|---------|---------|
| Navigation | `components/common/Navigation.tsx` | All pages | Top navbar with links |
| AuthWrapper | `components/auth/AuthWrapper.tsx` | Protected pages | Authentication check |
| Layout | `app/layout.tsx` | All pages | Root layout |

---

### **Form Components**

| Component | Source File | Used By | Purpose |
|-----------|-------------|---------|---------|
| BookingForm | `components/forms/BookingForm.tsx` | `/bookings/new` | Create booking |
| RegisterForm | `components/forms/RegisterForm.tsx` | `/register` | User signup |
| DonationForm | `components/forms/DonationForm.tsx` | `/donations` | Add donation |

---

### **Dashboard Components**

| Component | Source File | Used By | Purpose |
|-----------|-------------|---------|---------|
| UserDashboard | `components/dashboard/UserDashboard.tsx` | `/dashboard` | User overview |
| AdminDashboard | `components/admin/AdminDashboard.tsx` | `/admin` | Admin overview |

---

### **Slot Components**

| Component | Source File | Used By | Purpose |
|-----------|-------------|---------|---------|
| SlotGrid | `components/slots/SlotGrid.tsx` | Booking pages | Display slot grid |
| SlotCard | `components/slots/SlotCard.tsx` | Marketplace | Individual slot card |

---

### **Booking Components**

| Component | Source File | Used By | Purpose |
|-----------|-------------|---------|---------|
| UserBookingsList | `components/bookings/UserBookingsList.tsx` | `/bookings` | Show user bookings |
| BookingConfirmation | `components/bookings/BookingConfirmation.tsx` | After booking | Confirmation view |
| TimeRangePicker | `components/bookings/TimeRangePicker.tsx` | Booking forms | Select time slot |

---

## 🗄️ **DATABASE MIGRATIONS**

| Migration File | Purpose | Run Order |
|----------------|---------|-----------|
| `db/schema_v2.sql` | Base schema (users, slots, bookings) | 1st |
| `db/rls_policies.sql` | Row level security policies | 2nd (OLD - Replace) |
| `db/rls_policies_consolidated.sql` | **NEW** Consolidated RLS policies | 2nd (NEW) |
| `db/migrations/add_slot_ownership.sql` | Add owner_id to slots | 3rd |
| `db/migrations/007_marketplace_model.sql` | Marketplace features | 4th |
| `db/migrations/viber-migration-updates.sql` | Viber migration features | 5th (OLD - Replace) |
| `db/migrations/viber-migration-updates-FIXED.sql` | **NEW** Fixed Viber features | 5th (NEW) |
| `db/seed_data.sql` | Test data | Last |

---

## 🔍 **API ROUTES / SERVER ACTIONS** (If applicable)

| Endpoint | Source File | Purpose |
|----------|-------------|---------|
| N/A | Using Supabase client-side | Direct DB access |

> **Note:** ParkBoard uses Supabase client (`lib/supabase.ts`) for all database operations, no custom API routes needed.

---

## 🛠️ **UTILITY / LIB FILES**

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Supabase client configuration |
| `lib/auth.ts` | Authentication utilities |
| `lib/bookings.ts` | Booking-related functions |
| `lib/donations.ts` | Donation utilities |
| `lib/admin.ts` | Admin helper functions |

---

## 📊 **URL PATTERNS & DYNAMIC ROUTES**

### **Pattern: `/marketplace/[slotId]`**
- **Example:** `/marketplace/42`
- **Source:** `app/marketplace/[slotId]/page.tsx`
- **Dynamic Param:** `slotId` - the parking slot ID
- **Access in code:** `params.slotId`

### **Pattern: `/owner/slots/[slotId]/edit`**
- **Example:** `/owner/slots/42/edit`
- **Source:** `app/owner/slots/[slotId]/edit/page.tsx`
- **Dynamic Param:** `slotId` - the parking slot ID
- **Access in code:** `params.slotId`

### **Pattern: `/bookings/[bookingId]`** (If exists)
- **Example:** `/bookings/123`
- **Source:** `app/bookings/[bookingId]/page.tsx` (Check if exists)
- **Dynamic Param:** `bookingId` - the booking ID

---

## 🚦 **ROUTING LOGIC**

### **`/dashboard` Smart Routing**
Located in: `app/dashboard/page.tsx`

**Logic:**
```typescript
useEffect(() => {
  // Check user profile
  if (profile?.user_type === 'owner') {
    // Check if has slots
    if (hasSlots) {
      router.push('/owner');
    } else {
      router.push('/owner/setup'); // First time owner
    }
  } else if (profile?.user_type === 'renter') {
    router.push('/marketplace');
  } else {
    // No user type set
    router.push('/onboarding');
  }
}, [profile]);
```

---

## 🔐 **AUTHENTICATION FLOW**

```
User Visits Site
       ↓
  Is logged in?
       ↓
    NO → /login or /register
       ↓
    YES → /dashboard (smart router)
       ↓
  Has user_type?
       ↓
    NO → /onboarding
       ↓
    YES
       ↓
   Is owner? → /owner (if has slots) or /owner/setup (if no slots)
       ↓
   Is renter? → /marketplace
       ↓
   Is admin? → /admin
```

---

## 🐛 **DEBUGGING QUICK REFERENCE**

### **"Page not found" Error**
1. Check if file exists at correct path
2. Verify Next.js 13+ app directory structure
3. Check for typos in folder names (case-sensitive on Linux)

### **"Access denied" Error**
1. Check RLS policies in Supabase
2. Verify user is authenticated (`auth.uid()` exists)
3. Check user role in `user_profiles` table

### **"Infinite redirect loop"**
1. Check smart routing logic in `/dashboard`
2. Verify user profile has `user_type` set
3. Look for circular redirects between pages

### **"Component not found"**
1. Check import path (`@/components/...`)
2. Verify component file exists
3. Check for export/import mismatch (default vs named)

---

## 📝 **QUICK NAVIGATION COMMANDS**

### **For Development:**
```bash
# Open specific page file
code app/marketplace/page.tsx

# Open specific component
code components/common/Navigation.tsx

# Open database schema
code db/schema_v2.sql

# Check all routes
ls -R app/**/*.tsx | grep "page.tsx"
```

---

## 🎯 **PRIORITY FILES FOR VIBER MIGRATION**

These are the key files you'll be testing/debugging:

1. **`app/marketplace/page.tsx`** - Browse slots (search speed test)
2. **`app/marketplace/[slotId]/page.tsx`** - Slot details (no PM needed)
3. **`app/owner/page.tsx`** - Owner dashboard (quick availability)
4. **`app/owner/setup/page.tsx`** - List slot (complex schedules)
5. **`db/migrations/viber-migration-updates-FIXED.sql`** - Database schema
6. **`db/rls_policies_consolidated.sql`** - Security policies

---

## 📖 **RELATED DOCUMENTATION**

- **Implementation Guide:** `MARKETPLACE_IMPLEMENTATION.md`
- **Testing Plan:** `ParkBoard Marketplace - Manual Testing Plan & Debug Guide.md`
- **Database Migration Guide:** `MIGRATION_EXECUTION_GUIDE.md` (in artifacts above)
- **MVP Plan:** `parkboard_mvp_plan.md`

---

**Need to find something specific? Use this format:**

- **URL:** The page users see in browser
- **Source:** The actual file in your codebase
- **Component:** Reusable UI element
- **Migration:** Database change script

**Pro Tip:** Use your IDE's search (Ctrl+P or Cmd+P) with these file paths to jump directly to any file!