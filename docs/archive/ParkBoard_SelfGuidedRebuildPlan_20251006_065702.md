# 🎯 ParkBoard: Self-Guided Rebuild Plan

I love this approach. Let's build this the right way - where **you understand every decision** and can debug without me.

---

## 📋 **Phase 0: Planning (Before Any Code)**

### **Question 1: What are we actually building?**

Before touching code, write down (in your own words):

1. **Core User Stories** (3-5 sentences each):
   - As a slot owner, I want to...
   - As a renter, I want to...
   - As either user, I need to...

2. **Critical Flows** (step-by-step):
   - Owner lists slot: [Step 1] → [Step 2] → ...
   - Renter books slot: [Step 1] → [Step 2] → ...
   - Both see bookings: [Step 1] → [Step 2] → ...

**Why this matters**: If you can't describe the flow in plain English, the code will be a mess.

---

## 🗄️ **Phase 1: Database First (Foundation)**

### **Task 1.1: Study the Schema**

Look at `Fixed Database Schema - Consistent with Code.txt`. Answer these:

1. **Why do we have 3 tables instead of 1?**
2. **What's the relationship between `user_profiles.id` and `auth.users`?**
3. **Why does `bookings` reference both `parking_slots` and `user_profiles`?**
4. **What happens if I delete a user? (CASCADE)**
5. **Why do we store `renter_phone` AND `owner_phone` in bookings?**

### **Task 1.2: RLS Policies - Decode Them**

For each RLS policy, explain **in your own words**:

```sql
-- Example:
CREATE POLICY "Anyone read slots" ON parking_slots 
  FOR SELECT USING (true);
```

**Your explanation**:
- What does this allow?
- What does it prevent?
- When would this fail?

**Do this for all 8 policies.**

### **Task 1.3: Run the Schema**

```bash
# In Supabase SQL Editor:
1. Copy the entire schema
2. Run it
3. Go to Table Editor - verify 3 tables exist
4. Go to Authentication - create a test user manually
5. In Table Editor, try to INSERT a row into user_profiles
   - Did it work? Why/why not?
```

**Checkpoint**: Can you manually create a user profile through Supabase UI?

---

## 🏗️ **Phase 2: Project Structure (Scaffolding)**

### **Task 2.1: Initialize Next.js**

```bash
npx create-next-app@14 parkboard-rebuild
cd parkboard-rebuild

# When prompted:
# - TypeScript? Yes
# - ESLint? Yes
# - Tailwind? Yes
# - src/ directory? No
# - App Router? Yes
# - Import alias? Yes (@/*)
```

### **Task 2.2: Install Dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-slot lucide-react
```

**Question**: Why do we need `@supabase/ssr` AND `@supabase/supabase-js`?

<details>
<summary>Hint</summary>

One is for client-side, one is for server-side. Next.js 14 has both environments.

</details>

### **Task 2.3: Create This Structure**

```
parkboard-rebuild/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # ← You'll build this
│   │   └── register/
│   │       └── page.tsx          # ← You'll build this
│   ├── (marketplace)/
│   │   ├── slots/
│   │   │   ├── page.tsx          # ← Browse slots
│   │   │   ├── [slotId]/
│   │   │   │   └── page.tsx      # ← Book a slot
│   │   │   └── new/
│   │   │       └── page.tsx      # ← List new slot
│   │   └── bookings/
│   │       └── page.tsx          # ← My bookings
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn components (we'll add these)
│   ├── auth/
│   │   └── AuthWrapper.tsx       # ← Critical - you'll build this
│   └── common/
│       ├── Navigation.tsx        # ← You'll build this
│       └── ErrorDisplay.tsx      # ← Simple reusable component
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # ← Browser Supabase client
│   │   ├── server.ts             # ← Server Supabase client
│   │   └── middleware.ts         # ← Auth middleware
│   └── utils.ts                  # Tailwind cn() helper
└── .env.local                    # Your Supabase keys
```

**Create all these files as empty files for now.**

```bash
# Quick scaffold:
mkdir -p app/\(auth\)/login app/\(auth\)/register
mkdir -p app/\(marketplace\)/slots/\[slotId\] app/\(marketplace\)/slots/new
mkdir -p app/\(marketplace\)/bookings
mkdir -p components/ui components/auth components/common
mkdir -p lib/supabase

touch app/\(auth\)/login/page.tsx
touch app/\(auth\)/register/page.tsx
touch app/\(marketplace\)/slots/page.tsx
touch app/\(marketplace\)/slots/\[slotId\]/page.tsx
touch app/\(marketplace\)/slots/new/page.tsx
touch app/\(marketplace\)/bookings/page.tsx
touch components/auth/AuthWrapper.tsx
touch components/common/Navigation.tsx
touch components/common/ErrorDisplay.tsx
touch lib/supabase/client.ts
touch lib/supabase/server.ts
touch lib/utils.ts
```

---

## 🔐 **Phase 3: Authentication Layer (Critical Foundation)**

### **Task 3.1: Supabase Clients**

**File: `lib/supabase/client.ts`**

```typescript
// This runs in the BROWSER
// Question: Why can we expose NEXT_PUBLIC_SUPABASE_ANON_KEY publicly?

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Your task**: Answer the question in the comment.

---

**File: `lib/supabase/server.ts`**

```typescript
// This runs on the SERVER
// Question: When would you use this vs the client?

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

**Your task**: 
1. Answer the question in the comment
2. Why do we need to pass `cookies` to the server client?
3. What happens if cookies aren't available?

---

### **Task 3.2: Environment Variables**

**File: `.env.local`**

```bash
# Get these from Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Questions**:
1. Why is the anon key safe to expose in the browser?
2. Where should you NEVER put the service_role_key?
3. What prefix makes an env var available to the browser?

---

### **Task 3.3: The Most Important File - AuthWrapper**

**File: `components/auth/AuthWrapper.tsx`**

I'll give you the **skeleton**. You fill in the **logic**.

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// ============================================================================
// SECTION 1: Type Definitions
// ============================================================================

interface Profile {
  id: string
  name: string
  email: string
  phone: string
  unit_number: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
}

// ============================================================================
// SECTION 2: Context Creation
// ============================================================================

// TODO: Create the context with createContext<AuthContextType | undefined>()

// TODO: Create the useAuth() hook
// - Should throw error if used outside AuthWrapper
// - Should return the context value

// ============================================================================
// SECTION 3: AuthWrapper Component
// ============================================================================

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  // TODO: Create state for user, profile, and loading

  // ============================================================================
  // SECTION 4: Initialize Auth on Mount
  // ============================================================================

  useEffect(() => {
    // TODO: 
    // 1. Get current session from supabase.auth.getSession()
    // 2. Set user state
    // 3. If user exists, fetch their profile from user_profiles table
    // 4. Set loading to false

    // TODO: Set up auth state listener
    // - Listen to auth.onAuthStateChange()
    // - Handle SIGNED_IN, SIGNED_OUT events
    // - Redirect to /login on SIGNED_OUT

    // TODO: Return cleanup function to unsubscribe
  }, [router, supabase])

  // ============================================================================
  // SECTION 5: Render Logic
  // ============================================================================

  // TODO: If loading, show a loading spinner
  // TODO: If no user, redirect to /login (or show loading while redirecting)
  // TODO: If user but no profile, show "Setting up your profile..."
  // TODO: Otherwise, render children wrapped in Context Provider

  return null // Replace this
}
```

**Your Tasks**:

1. **Fill in the TODOs** - Use comments to explain your reasoning
2. **Answer these design questions**:
   - Why do we separate `user` and `profile`?
   - Why do we need both `useEffect` and `onAuthStateChange`?
   - What happens if the profile fetch fails?
   - When would `loading` be true vs false?

**Testing Your AuthWrapper**:

```typescript
// app/test/page.tsx (create this temporarily)
'use client'

import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper'

function TestContent() {
  const { user, profile, loading } = useAuth()

  return (
    <div className="p-8">
      <h1>Auth Test Page</h1>
      <pre>{JSON.stringify({ user: user?.email, profile, loading }, null, 2)}</pre>
    </div>
  )
}

export default function TestPage() {
  return (
    <AuthWrapper>
      <TestContent />
    </AuthWrapper>
  )
}
```

**Run this**: Navigate to `/test` - what do you see?

---

## 🎨 **Phase 4: UI Foundation (shadcn/ui)**

### **Task 4.1: Install shadcn/ui**

```bash
npx shadcn@latest init

# When prompted:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
```

### **Task 4.2: Add Required Components**

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add alert
```

**Question**: Why do we use shadcn instead of a component library like MUI?

---

## 🔐 **Phase 5: Build Login/Register (Your First Real Page)**

### **Task 5.1: Login Page Structure**

**File: `app/(auth)/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  // TODO: Create state for email, password, error, loading

  // ============================================================================
  // TASK: Implement handleLogin
  // ============================================================================
  
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    
    // TODO:
    // 1. Set loading to true
    // 2. Call supabase.auth.signInWithPassword({ email, password })
    // 3. If error, set error state
    // 4. If success, router.push('/slots')
    // 5. Set loading to false
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to ParkBoard</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* TODO: Add email input */}
            {/* TODO: Add password input */}
            {/* TODO: Add error display (if error exists) */}
            {/* TODO: Add submit button (disabled when loading) */}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Your Tasks**:

1. Fill in all TODOs
2. Add proper TypeScript types
3. Test it by creating a user manually in Supabase, then logging in

**Questions to Answer**:
- What happens if you submit with empty fields?
- What error message shows for wrong password?
- How do you know the login succeeded?

---

### **Task 5.2: Register Page (Similar Pattern)**

**File: `app/(auth)/register/page.tsx`**

This follows the same pattern as login, but:

1. You need more fields: name, email, password, phone, unit_number
2. You call `supabase.auth.signUp()` instead of `signInWithPassword()`
3. After signup, you need to INSERT into `user_profiles` table

**Challenge**: Build this yourself, following the login pattern.

**Hint for user_profiles insert**:

```typescript
// After successful signUp:
const { data: authData } = await supabase.auth.signUp({ email, password })

if (authData.user) {
  await supabase.from('user_profiles').insert({
    id: authData.user.id,
    name,
    email,
    phone,
    unit_number
  })
}
```

**Question**: Why do we use `authData.user.id` for the profile id?

---

## 🛑 **Checkpoint: Can You Login?**

Before moving forward, you must be able to:

1. ✅ Register a new user
2. ✅ See that user in Supabase Auth dashboard
3. ✅ See that user's profile in `user_profiles` table
4. ✅ Login with that user
5. ✅ See the `/test` page showing your user info

**If any of these fail, debug before proceeding.**

---

## 📍 **Phase 6: Navigation Component**

**File: `components/common/Navigation.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthWrapper'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function Navigation() {
  const { profile } = useAuth()
  const supabase = createClient()

  // TODO: Implement handleSignOut
  // - Call supabase.auth.signOut()
  // - Redirect to /login

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/slots" className="text-xl font-bold">
              ParkBoard
            </Link>

            {/* TODO: Add navigation links */}
            {/* - Browse Slots (/slots) */}
            {/* - List Slot (/slots/new) */}
            {/* - My Bookings (/bookings) */}
          </div>

          <div className="flex items-center space-x-4">
            {/* TODO: Show user's name and unit */}
            {/* TODO: Add Sign Out button */}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

**Your Tasks**:
1. Fill in the TODOs
2. Add the Navigation to `app/layout.tsx` (wrapped in AuthWrapper)
3. Test that Sign Out works

---

## 📦 **Phase 7: Core Pages (The Meat)**

Now you'll build 4 pages. I'll give you the **structure** and **key questions**. You implement the logic.

### **Page 1: Browse Slots**

**File: `app/(marketplace)/slots/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthWrapper from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'

interface Slot {
  slot_id: number
  slot_number: string
  slot_type: string
  description: string | null
  price_per_hour: number
  is_available: boolean
  user_profiles: {
    name: string
    phone: string
  }
}

function SlotsContent() {
  const supabase = createClient()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  // ============================================================================
  // TASK 1: Fetch Available Slots
  // ============================================================================
  
  useEffect(() => {
    async function fetchSlots() {
      // TODO:
      // 1. Query parking_slots where is_available = true
      // 2. Include user_profiles (owner's name and phone)
      // 3. Set slots state
      // 4. Set loading to false
    }

    fetchSlots()
  }, [supabase])

  // ============================================================================
  // TASK 2: Render Slot Cards
  // ============================================================================

  if (loading) return <div>Loading slots...</div>

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Available Parking Slots</h1>

      {slots.length === 0 ? (
        <p>No slots available. Be the first to list one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {slots.map(slot => (
            // TODO: Render each slot as a clickable card
            // - Show slot_number, slot_type, price, description
            // - Link to /slots/[slotId]
          ))}
        </div>
      )}
    </div>
  )
}

export default function SlotsPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <SlotsContent />
    </AuthWrapper>
  )
}
```

**Questions**:
1. Why do we wrap the query logic in a separate `SlotsContent` component?
2. What Supabase query do you need to fetch slots with owner info?
3. How do you make each card clickable?

---

### **Page 2: Book a Slot**

**File: `app/(marketplace)/slots/[slotId]/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthWrapper'
import AuthWrapper from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'

function BookSlotContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const slotId = params.slotId as string

  // TODO: State for slot details, start_time, end_time, loading, error

  // ============================================================================
  // TASK 1: Fetch Slot Details
  // ============================================================================

  useEffect(() => {
    // TODO: Fetch the slot by slotId
    // Include owner's name and phone
  }, [slotId, supabase])

  // ============================================================================
  // TASK 2: Calculate Price
  // ============================================================================

  // TODO: Create a function that calculates total price
  // Based on start_time, end_time, and price_per_hour

  // ============================================================================
  // TASK 3: Submit Booking
  // ============================================================================

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()

    // TODO:
    // 1. Validate start_time < end_time
    // 2. Get user's profile (for renter_phone)
    // 3. Get slot owner's profile (for owner_phone)
    // 4. Insert into bookings table
    // 5. Show success message
    // 6. Redirect to /bookings
  }

  // TODO: Render form with:
  // - Slot details (read-only)
  // - Date/time pickers for start and end
  // - Live price calculation display
  // - Submit button
}

export default function BookSlotPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <BookSlotContent />
    </AuthWrapper>
  )
}
```

**Key Challenges**:
1. How do you calculate hours between two datetimes?
2. How do you fetch the owner's phone for the booking?
3. What validation do you need before submitting?

---

### **Page 3: List New Slot**

**File: `app/(marketplace)/slots/new/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthWrapper'

function NewSlotContent() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  // TODO: State for form fields and loading/error

  // ============================================================================
  // TASK: Create New Slot
  // ============================================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // TODO:
    // 1. Validate required fields
    // 2. Insert into parking_slots table
    //    - owner_id = user.id
    //    - is_available = true
    // 3. Redirect to /slots on success
  }

  // TODO: Render form with:
  // - Slot number input
  // - Slot type selector (covered/uncovered)
  // - Description textarea
  // - Price per hour input
  // - Contact info textarea
  // - Submit button
}

export default function NewSlotPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <NewSlotContent />
    </AuthWrapper>
  )
}
```

**Questions**:
1. Why don't we ask for `owner_id` in the form?
2. What validation should happen before submitting?
3. Should you check if the slot_number already exists?

---

### **Page 4: My Bookings**

**File: `app/(marketplace)/bookings/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthWrapper'

interface Booking {
  booking_id: number
  start_time: string
  end_time: string
  total_price: number
  status: string
  parking_slots: {
    slot_number: string
    user_profiles: {
      name: string
      phone: string
    }
  }
}

function BookingsContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>([])

  // ============================================================================
  // TASK 1: Fetch User's Bookings
  // ============================================================================

  useEffect(() => {
    async function fetchBookings() {
      // TODO:
      // 1. Query bookings where renter_id = user.id
      // 2. Include slot details and owner info
      // 3. Order by created_at DESC
    }

    fetchBookings()
  }, [user, supabase])

  // ============================================================================
  // TASK 2: Display Bookings
  // ============================================================================

  // TODO: Render list of bookings showing:
  // - Slot number
  // - Start and end times
  // - Total price
  // - Status badge (pending/confirmed/cancelled)
  // - Owner contact info
}

export default function BookingsPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <BookingsContent />
    </AuthWrapper>
  )
}
```

**Questions**:
1. How do you include nested data (slot → owner) in the query?
2. How do you format the datetime for display?
3. Should you show cancelled bookings?

---

## 🎓 **Learning Checkpoints**

After completing each phase, you should be able to answer:

### **Phase 3 (Auth)**:
- [ ] How does Supabase Auth work with Next.js?
- [ ] Why do we need separate client/server Supabase instances?
- [ ] What's the role of RLS in security?

### **Phase 5 (Login/Register)**:
- [ ] How do you handle form submission in React?
- [ ] How do you manage loading/error states?
- [ ] How do you link auth.users to user_profiles?

### **Phase 7 (Core Pages)**:
- [ ] How do you fetch related data (joins) in Supabase?
- [ ] How do you pass data between pages (URL params)?
- [ ] How do you calculate derived values (like total price)?

---

## 🐛 **Debugging Strategy**

When something breaks, follow this process:

1. **Read the error message** - What line? What file?
2. **Check the browser console** - Are there client-side errors?
3. **Check the terminal** - Are there server-side errors?
4. **Check Supabase logs** - Did the query fail? Why?
5. **Use console.log()** - What's the state at each step?

**Example Debugging Flow**:

```typescript
// If a query fails, debug like this:

console.log('1. User ID:', user?.id)

const { data, error } = await supabase
  .from('parking_slots')
  .select('*, user_profiles(*)')
  .eq('is_available', true)

console.log('2. Query result:', { data, error })

if (error) {
  console.log('3. Error details:', {
    message: error.message,
    code: error.code,
    details: error.details
  })
}

setSlots(data || [])
console.log('4. State updated:', data?.length, 'slots')
```

---

## 📚 **Resources You'll Need**

Keep these tabs open:

1. **Supabase Docs**: https://supabase.com/docs/guides/database/joins
2. **Next.js Docs**: https://nextjs.org/docs/app/building-your-application/routing
3. **React Docs**: https://react.dev/reference/react
4. **Tailwind Docs**: https://tailwindcss.com/docs

---

## 🎯 **Your First Milestone**

**By the end of Phase 7, you should be able to**:

1. ✅ Register a new user
2. ✅ Login as that user
3. ✅ List a parking slot
4. ✅ See that slot in the marketplace
5. ✅ Book that slot as a different user
6. ✅ See the booking in "My Bookings"

**This is a working MVP.**

---

## 🚀 **Next Steps After MVP**

Once you have the core working:

1. **Add error handling everywhere**
2. **Add loading states to all async operations**
3. **Add form validation**
4. **Style it better with Tailwind**
5. **Add owner dashboard** (see bookings for your slots)
6. **Add booking status updates** (confirm/cancel)

---

## 💭 **Reflection Questions**

After each phase, write down:

1. **What was confusing?**
2. **What pattern did you learn?**
3. **How would you explain this to someone else?**

This reflection is **critical** for internalizing the patterns.

---

## 🎤 **Ready to Start?**

Tell me:

1. **Which phase are you starting with?**
2. **What's the first file you're going to tackle?**
3. **What's your biggest concern right now?**

I'll be here to answer **specific questions** as you build, but I won't write the code for you. 

**You got this.** 🚀