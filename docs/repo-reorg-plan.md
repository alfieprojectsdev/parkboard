# ParkBoard Repository Reorganization Plan

## Directory Structure Changes

```
parkboard/
├── app/
│   ├── (auth)/                    # Auth group
│   │   └── login/
│   │       └── page.tsx
│   ├── (protected)/               # Protected routes group
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── bookings/
│   │   │   ├── page.tsx          # View bookings
│   │   │   └── new/
│   │   │       └── page.tsx      # New booking
│   │   └── admin/
│   │       ├── page.tsx          # Admin dashboard
│   │       ├── slots/
│   │       │   └── page.tsx
│   │       └── users/
│   │       │   └── page.tsx
│   ├── api/                       # Keep as is
│   ├── about/
│   │   └── page.tsx
│   ├── layout.tsx
│   └── page.tsx                   # Home page
│
├── components/
│   ├── auth/
│   │   ├── AuthWrapper.tsx
│   │   └── DevAuthWrapper.tsx
│   ├── booking/
│   │   ├── BookingCard.tsx
│   │   ├── BookingConfirmation.tsx
│   │   ├── BookingForm.tsx
│   │   ├── SlotGrid.tsx
│   │   ├── TimeRangePicker.tsx
│   │   └── UserBookingsList.tsx
│   ├── admin/
│   │   └── AdminDashboard.tsx
│   ├── common/
│   │   ├── ErrorDisplay.tsx
│   │   └── Navigation.tsx
│   ├── ui/                        # Keep shadcn components
│   └── UserDashboard.tsx
│
├── lib/                            # Keep as is
│
├── _deprecated/                    # Move out-of-scope items here
│   ├── donations/
│   │   ├── page.tsx
│   │   ├── DonationForm.tsx
│   │   └── api_route.ts
│   ├── register/
│   │   ├── page.tsx
│   │   └── RegisterForm.tsx
│   ├── slots/                     # Old slots page
│   │   └── page.tsx
│   └── TailwindTest.tsx
│
└── db/                             # Keep as is
```

## Files to Move to _deprecated

1. `app/donations/page.tsx` → `_deprecated/donations/page.tsx`
2. `app/register/page.tsx` → `_deprecated/register/page.tsx`
3. `app/slots/page.tsx` → `_deprecated/slots/page.tsx`
4. `app/api/donations/route.ts` → `_deprecated/donations/api_route.ts`
5. `components/forms/DonationForm.tsx` → `_deprecated/donations/DonationForm.tsx`
6. `components/forms/RegisterForm.tsx` → `_deprecated/register/RegisterForm.tsx`
7. `components/TailwindTest.tsx` → `_deprecated/TailwindTest.tsx`

## Files to Delete

1. `app/test/page.tsx` - redundant test page
2. Old migration file `005_create_donations.sql` - not needed for parking MVP

## Files to Update/Fix

### 1. Fix Navigation.tsx encoding
Replace "â€¢" with "•" in the Navigation component

### 2. Update app/admin/page.tsx
Replace the current implementation with the proper admin dashboard that was created

### 3. Clean up app/bookings/new/page.tsx
Use the proper client component pattern

### 4. Update imports after reorganization
Update all import paths to reflect new component organization
