# ParkBoard - Complete Project Context

## Overview
**ParkBoard** is a parking slot marketplace for residential condominiums. 
P2P parking slot rental platform migrating users from Viber to a proper web platform.

### Core Features:
- 🚗 Slot ownership & marketplace listing
- 📅 Complex availability scheduling
- ⚡ "Available NOW" quick posting
- 🔍 Fast search with location tags
- 💰 Zero-PM booking flow
- ✅ Viber member trust signals

### Tech Stack:
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes (server-side)
- **Database:** Supabase (PostgreSQL) with RLS
- **Auth:** Supabase Auth
- **State:** React Context + hooks
- **Deployment:** Vercel

---

## Project Structure

```
app/api/profiles/route.ts
app/bookings/new/page.tsx
app/bookings/page.tsx
app/globals.css
app/layout.tsx
app/login/page.tsx
app/page.tsx
app/register/page.tsx
app/slots/new/page.tsx
app/slots/page.tsx
CLAUDE.md
.claude/settings.local.json
components/auth/AuthWrapper.tsx
components/common/ErrorDisplay.tsx
components/common/Navigation.tsx
components/common/ToastNotification.tsx
components/ErrorBoundary.tsx
components.json
components/ui/alert.tsx
components/ui/badge.tsx
components/ui/button.tsx
components/ui/card.tsx
components/ui/input.tsx
components/ui/tabs.tsx
create_user.js
db/schema.sql
docs/00_20251003_131248_file_manifest.md.md
docs/02_20251003_130106_mvp_launch_checklist.md
docs/20251003_130000_emergency_mvp_plan.md
docs/files_03_06_summary.md
.env
.env.local
export_for_claude_20251003_215953.sh
.github/copilot-instructions.md
.gitignore
jest.config.cjs
lib/supabase.ts
lib/utils.ts
mvp-pages.ts
next-env.d.ts
package.json
package.json.backup
package-json-fix.json
package-lock.json
package-lock.json.backup
parkboard_claude_context_2025-10-04_172107.md
parkboard_claude_context_2025-10-04_172204.md
parkboard_code_snapshot_2025-10-03_220037.md
parkboard.code-workspace
playwright.config.ts
playwright-report/index.html
postcss.config.js
project-structure.txt
src/lib/supabase.js
tailwind.config.js
tests/e2e.spec.ts
__tests__/login.test.tsx
tests/setupTests.js
__tests__/setup.ts
tests/unit/BookingForm.test.js
tests/unit/RegisterPage.test.js
tsconfig.json
vitest.config.ts
.vscode/mcp.json
```

## Database Schema & Migrations

```sql
// db/schema.sql (Size: 4.0K)

-- ============================================================================
-- NUCLEAR MVP SCHEMA - ParkBoard
-- Delete EVERYTHING else. This is ALL you need.
-- ============================================================================

-- Enable required extension for date range overlap checking
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Start fresh (run in Supabase SQL editor)
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- 1. User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL, -- Required for trust
  unit_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Parking slots (dead simple)
CREATE TABLE parking_slots (
  id SERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  slot_number TEXT NOT NULL,
  price_per_day INTEGER NOT NULL, -- Just pesos, no decimals
  description TEXT, -- "Near elevator, covered"
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bookings (minimal)
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES parking_slots(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renter_phone TEXT NOT NULL, -- Copied from profile at booking time
  owner_phone TEXT NOT NULL, -- Copied from owner profile
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent double booking
  CONSTRAINT no_overlap EXCLUDE USING gist (
    slot_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status != 'cancelled')
);

-- Basic indexes only
CREATE INDEX idx_slots_available ON parking_slots(is_available);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);

-- Simple RLS (or skip entirely and use API validation)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Everyone can read, users can modify their own
CREATE POLICY "Public read" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users update own" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Public read slots" ON parking_slots FOR SELECT USING (true);
CREATE POLICY "Owners manage own slots" ON parking_slots FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users see own bookings" ON bookings FOR SELECT 
  USING (auth.uid() = renter_id OR auth.uid() IN (
    SELECT owner_id FROM parking_slots WHERE id = bookings.slot_id
  ));
CREATE POLICY "Users create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = renter_id);
CREATE POLICY "Users update own bookings" ON bookings FOR UPDATE USING (auth.uid() = renter_id);

-- That's it. Nothing else.
```

## Type Definitions

```typescript
// ./next-env.d.ts (Size: 4.0K)

/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.

```

## Application Source Code

### Core Files

```typescript
// app/layout.tsx (Size: 4.0K)

// =====================================================
// File: app/layout.tsx
// Updated with ErrorBoundary and ToastProvider
// =====================================================
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata = {
  title: 'ParkBoard - Parking Management',
  description: 'Condo parking booking system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}

```

```typescript
// app/page.tsx (Size: 4.0K)

// ============================================================================
// app/page.tsx - Dead simple landing page
// ============================================================================
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl">ParkBoard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl text-center mb-8">Rent parking slots in your condo</p>
          
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/slots">Browse Slots</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/slots/new">List Your Slot</Link>
            </Button>
          </div>
          
          <div className="mt-8 flex gap-4 justify-center text-sm">
            <Button asChild variant="link">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="link">
              <Link href="/login?mode=signup">Sign Up</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
```

```css
// app/globals.css (Size: 4.0K)

/* app/globals.css - Working with Tailwind v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom CSS variables for your theme */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }

  * {
    border-color: hsl(var(--border));
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}

/* Toast notification animations */
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-out-right {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}

.animate-slide-out-right {
  animation: slide-out-right 0.2s ease-in;
}
```

```typescript
// lib/supabase.ts (Size: 4.0K)

// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

```

```typescript
// lib/utils.ts (Size: 4.0K)

// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### App Directory

```typescript
// ./app/api/profiles/route.ts (Size: 4.0K)

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const PHONE_REGEX = /^(\+63|0)\d{10}$/;  // Philippine phone format

interface ProfileData {
  id: string;
  name: string;
  unit_number: string;
  phone: string;
  email: string;
}

export async function POST(req: Request) {
  try {
    const { id, name, unit_number, phone, email } = await req.json();

    // Validate required fields
    if (!id || !name || !unit_number || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields', fields: { id, name, unit_number, phone } },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use +63 or 0 followed by 10 digits' },
        { status: 400 }
      );
    }

    // Check for existing unit number
    const { data: existingUnit } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('unit_number', unit_number)
      .single();

    if (existingUnit) {
      return NextResponse.json(
        { error: 'Unit number is already registered' },
        { status: 409 }
      );
    }

    const { error } = await supabase.from('user_profiles').insert({
      id,
      name,
      unit_number,
      phone,
      email
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}
```

```typescript
// ./app/bookings/new/page.tsx (Size: 8.0K)

// ============================================================================
// app/bookings/new/page.tsx - Create a booking
// ============================================================================
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthWrapper from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

export default function NewBooking() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slotId = searchParams.get('slot')

  const [loading, setLoading] = useState(false)
  const [slot, setSlot] = useState<any>(null)
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    if (slotId) fetchSlot()
  }, [slotId])

  async function fetchSlot() {
    const { data } = await supabase
      .from('parking_slots')
      .select(`
        *,
        user_profiles!owner_id (name, phone)
      `)
      .eq('id', slotId)
      .single()

    if (data) setSlot(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Please login first')
      router.push('/login')
      return
    }

    // Get renter's profile
    const { data: renterProfile } = await supabase
      .from('user_profiles')
      .select()
      .eq('id', user.id)
      .single()

    if (!renterProfile) {
      alert('Please try logging in again')
      router.push('/login')
      return
    }

    // Create booking
    const { error } = await supabase.from('bookings').insert({
      slot_id: slotId,
      renter_id: user.id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      renter_phone: renterProfile.phone,
      owner_phone: slot.user_profiles.phone,
      status: 'pending'
    })

    if (error) {
      alert('Booking failed: ' + error.message)
    } else {
      alert(`Booking created! Contact owner at ${slot.user_profiles.phone} to confirm.`)
      router.push('/bookings')
    }

    setLoading(false)
  }

  if (!slot) return <div className="p-8">Loading...</div>

  return (
    <AuthWrapper>
      <Navigation />
      <main className="max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Book Parking Slot</CardTitle>
          </CardHeader>
          <CardContent>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="font-semibold">Slot {slot.slot_number}</h2>
          <p className="text-gray-600">{slot.description}</p>
          <p className="text-xl font-bold mt-2">₱{slot.price_per_day}/day</p>
          <p className="text-sm text-gray-500">Owner: {slot.user_profiles.name}</p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <Input
            type="date"
            required
            min={new Date().toISOString().split('T')[0]}
            value={formData.start_date}
            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <Input
            type="date"
            required
            min={formData.start_date || new Date().toISOString().split('T')[0]}
            value={formData.end_date}
            onChange={(e) => setFormData({...formData, end_date: e.target.value})}
          />
        </div>

        <Alert className="mt-4">
          <strong>Total: </strong>
          {formData.start_date && formData.end_date ? (
            <>₱{slot.price_per_day * (Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1)}</>
          ) : (
            <>Select dates</>
          )}
        </Alert>

        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-4"
        >
          {loading ? 'Booking...' : 'Confirm Booking'}
        </Button>
      </form>
          </CardContent>
        </Card>
      </main>
    </AuthWrapper>
  )
}

```

```typescript
// ./app/bookings/page.tsx (Size: 12K)

"use client";

import { useEffect, useState } from "react";
import AuthWrapper from "@/components/auth/AuthWrapper";
import Navigation from "@/components/common/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  slot_id: number;
  renter_id: string;
  start_date: string;
  end_date: string;
  renter_phone: string;
  owner_phone: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  slot: {
    slot_number: string;
    owner_id: string;
    owner: {
      name: string;
      unit_number: string;
    }
  }
}

import { useToast } from "@/components/common/ToastNotification";

function BookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      fetchBookings();
    };
    init();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          slot:parking_slots (
            slot_number,
            owner_id,
            owner:user_profiles (
              name,
              unit_number
            )
          )
        `)
        .order('start_date', { ascending: false });

      if (fetchError) throw fetchError;
      setBookings(data || []);

    } catch (err) {
      setError(err.message);
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: true }));
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (cancelError) throw cancelError;
      
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled.",
        variant: "default",
      });

      // Optimistic update
      setBookings(bookings => bookings.map(b => 
        b.id === bookingId ? {...b, status: 'cancelled'} : b
      ));
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleApproveBooking = async (bookingId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: true }));
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      toast({
        title: "Booking Approved",
        description: "The booking has been confirmed.",
        variant: "default",
      });

      // Optimistic update
      setBookings(bookings => bookings.map(b => 
        b.id === bookingId ? {...b, status: 'confirmed'} : b
      ));
    } catch (err) {
      console.error('Error approving booking:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to approve booking",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: true }));
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      toast({
        title: "Booking Rejected",
        description: "The booking has been cancelled.",
        variant: "default",
      });

      // Optimistic update
      setBookings(bookings => bookings.map(b => 
        b.id === bookingId ? {...b, status: 'cancelled'} : b
      ));
    } catch (err) {
      console.error('Error rejecting booking:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to reject booking",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  return (
    <AuthWrapper>
      <Navigation />
      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <Button onClick={() => window.location.href = '/bookings/new'}>
            New Booking
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8">Loading your bookings...</div>
        ) : bookings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 mb-4">You don't have any bookings yet.</p>
            <Button onClick={() => window.location.href = '/bookings/new'}>
              Book a Parking Slot
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">
                      Slot {booking.slot?.slot_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Owner: {booking.slot?.owner?.name} ({booking.slot?.owner?.unit_number})
                    </p>
                  </div>
                  <Badge variant={
                    booking.status === 'confirmed' ? 'secondary' :
                    booking.status === 'cancelled' ? 'destructive' : 'default'
                  }>
                    {booking.status}
                  </Badge>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Dates:</span>{" "}
                    {new Date(booking.start_date).toLocaleDateString()} to{" "}
                    {new Date(booking.end_date).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Contact:</span>{" "}
                    Owner: {booking.owner_phone} | You: {booking.renter_phone}
                  </div>
                </div>

                <div className="mt-4 space-x-2 flex">
                  {booking.status === 'confirmed' && (
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={actionLoading[booking.id]}
                    >
                      {actionLoading[booking.id] ? (
                        <>
                          <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel Booking'
                      )}
                    </Button>
                  )}
                  {booking.status === 'pending' && currentUserId === booking.slot?.owner_id && (
                    <>
                      <Button
                        variant="default"
                        onClick={() => handleApproveBooking(booking.id)}
                        disabled={actionLoading[booking.id]}
                      >
                        {actionLoading[booking.id] ? (
                          <>
                            <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin mr-2" />
                            Approving...
                          </>
                        ) : (
                          'Approve Booking'
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectBooking(booking.id)}
                        disabled={actionLoading[booking.id]}
                      >
                        {actionLoading[booking.id] ? (
                          <>
                            <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2" />
                            Rejecting...
                          </>
                        ) : (
                          'Reject Booking'
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </AuthWrapper>
  );
}

export default BookingsPage;

```

```typescript
// ./app/login/page.tsx (Size: 12K)

// app/login/page.tsx - Fixed version with proper error handling
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

async function retryWithBackoff(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

const PHONE_REGEX = /^(\+63|0)\d{10}$/;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setName("");
    setUnitNumber("");
    setPhone("");

    clearMessages();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      const returnUrl = searchParams?.get('returnUrl') || '/slots';
      router.replace(returnUrl);
    } catch (error: any) {
      setErrorMsg(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    // Validation
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const phoneRegex = /^(\+63|0)\d{10}$/;

    if (!name.trim() || !unitNumber.trim() || !phone.trim()) {
      setErrorMsg("Name, unit number, and phone are required");
      setLoading(false);
      return;
    }

    if (!phoneRegex.test(phone.trim())) {
      setErrorMsg("Invalid phone number format. Use +63 or 0 followed by 10 digits");
      setLoading(false);
      return;
    }    try {
      // Create auth user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) throw signupError;
      if (!authData.user) throw new Error("No user data returned from signup");

      // Create profile using API route with retry
      try {
        const profileResponse = await retryWithBackoff(async () => {
          if (!authData?.user?.id || !authData?.user?.email) {
            throw new Error("Missing user data");
          }
          return fetch('/api/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: authData.user.id,
              email: authData.user.email,
              name: name.trim(),
              unit_number: unitNumber.trim(),
              phone: phone.trim()
            })
          });
        });

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json();
          throw new Error(errorData.error || "Failed to create profile");
        }

        // Verify profile was created
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select()
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("Profile creation failed");
        }
      } catch (profileError: any) {
        // Clean up auth user if profile creation fails
        await supabase.auth.signOut();
        throw new Error(profileError.message || "Failed to set up account");
      }

      setSuccessMsg("Account created successfully! You can now sign in.");
      setMode('login');
      resetForm();

    } catch (error: any) {
      console.error('Signup error:', error);
      setErrorMsg(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccessMsg("Password reset link sent to your email. Check your inbox!");
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup' | 'reset') => {
    setMode(newMode);
    resetForm();
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Sign Up';
      case 'reset': return 'Reset Password';
      default: return 'Login';
    }
  };

  const getSubmitText = () => {
    if (loading) {
      switch (mode) {
        case 'signup': return 'Creating account...';
        case 'reset': return 'Sending reset link...';
        default: return 'Signing in...';
      }
    }
    switch (mode) {
      case 'signup': return 'Sign Up';
      case 'reset': return 'Send Reset Link';
      default: return 'Sign In';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handlePasswordReset} 
            className="space-y-4"
          >
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            {mode !== 'reset' && (
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            )}
            
            {mode === 'signup' && (
              <>
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Unit Number"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  required
                />
                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number (+63XXXXXXXXXX)"
                    value={phone}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9+]/g, '');
                      if (value.startsWith('0')) {
                        value = '+63' + value.substring(1);
                      } else if (!value.startsWith('+')) {
                        value = '+63' + value;
                      }
                      // Limit to proper length
                      if (value.startsWith('+63')) {
                        value = value.substring(0, 13);
                      }
                      setPhone(value);
                    }}
                    required
                    pattern="^(\+63|0)\d{10}$"
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !PHONE_REGEX.test(value)) {
                        setErrorMsg('Invalid phone number format');
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: +63 or 0 followed by 10 digits
                  </p>
                </div>
              </>
            )}
            
            {errorMsg && (
              <Alert variant="destructive">{errorMsg}</Alert>
            )}
            
            {successMsg && (
              <Alert variant="default" className="border-green-200 text-green-800 bg-green-50">
                {successMsg}
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              <div className="flex items-center justify-center gap-2">
                {loading && <div className="w-4 h-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />}
                {getSubmitText()}
              </div>
            </Button>
          </form>
          
          <div className="mt-4 space-y-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-blue-600 hover:text-blue-800 underline block w-full"
                >
                  Don't have an account? Sign up
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-gray-600 hover:text-gray-800 underline block w-full"
                >
                  Forgot your password?
                </button>
              </>
            )}
            
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 underline block w-full"
              >
                Already have an account? Sign in
              </button>
            )}
            
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 underline block w-full"
              >
                Back to login
              </button>
            )}
          </div>


        </CardContent>
      </Card>
    </div>
  );
}
```

```typescript
// ./app/register/page.tsx (Size: 4.0K)

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/login?mode=signup');
  }, [router]);

  return null;
}

```

```typescript
// ./app/slots/new/page.tsx (Size: 4.0K)

// ============================================================================
// app/slots/new/page.tsx - List a new slot (owners)
// ============================================================================
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthWrapper from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

export default function ListSlot() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    slot_number: '',
    price_per_day: '',
    description: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('Please login first')
      router.push('/login')
      return
    }

    // Check if profile exists, create if not
    const { data: profile } = await supabase
      .from('user_profiles')
      .select()
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Create profile first
      const name = prompt('Your name:') || 'User'
      const phone = prompt('Your phone number:') || ''
      const unit = prompt('Your unit number:') || ''
      
      await supabase.from('user_profiles').insert({
        id: user.id,
        name,
        phone,
        unit_number: unit
      })
    }

    // Create the slot
    const { error } = await supabase.from('parking_slots').insert({
      owner_id: user.id,
      slot_number: formData.slot_number,
      price_per_day: parseInt(formData.price_per_day),
      description: formData.description,
      is_available: true
    })

    if (error) {
      alert('Error creating slot: ' + error.message)
    } else {
      alert('Slot listed successfully!')
      router.push('/slots')
    }
    
    setLoading(false)
  }

  return (
    <AuthWrapper>
      <Navigation />
      <main className="max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>List Your Parking Slot</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Slot Number/Location
          </label>
          <Input
            type="text"
            required
            placeholder="e.g. B2-15, Near elevator"
            value={formData.slot_number}
            onChange={(e) => setFormData({...formData, slot_number: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Price per Day (₱)
          </label>
          <Input
            type="number"
            required
            min="1"
            placeholder="150"
            value={formData.price_per_day}
            onChange={(e) => setFormData({...formData, price_per_day: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description (optional)
          </label>
          <textarea
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
            placeholder="Covered, near entrance, fits SUV..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating...' : 'List Slot'}
        </Button>
      </form>
          </CardContent>
        </Card>
      </main>
    </AuthWrapper>
  )
}
```

```typescript
// ./app/slots/page.tsx (Size: 4.0K)

// ============================================================================
// app/slots/page.tsx - Browse available slots
// ============================================================================
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AuthWrapper from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function BrowseSlots() {
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSlots()
  }, [])

  async function fetchSlots() {
    const { data, error } = await supabase
      .from('parking_slots')
      .select(`
        *,
        user_profiles!owner_id (name, phone)
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSlots(data)
    }
    setLoading(false)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <AuthWrapper>
      <Navigation />
      <main className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Available Parking Slots</h1>
          <Button asChild>
            <Link href="/slots/new">List Your Slot</Link>
          </Button>
        </div>

      {slots.length === 0 ? (
        <p className="text-gray-500">No slots available. Be the first to list one!</p>
      ) : (
        <div className="grid gap-4">
          {slots.map(slot => (
            <Card key={slot.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">Slot {slot.slot_number}</h3>
                  <p className="text-gray-600">{slot.description || 'Standard parking slot'}</p>
                  <p className="text-2xl font-bold mt-2">₱{slot.price_per_day}/day</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Owner: {slot.user_profiles?.name}</p>
                  <Button variant="secondary" asChild className="mt-2">
                    <Link href={`/bookings/new?slot=${slot.id}`}>Book Now</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
    </AuthWrapper>
  )
}


```

### Components

```typescript
// ./components/auth/AuthWrapper.tsx (Size: 12K)

// components/auth/AuthWrapper.tsx
"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Profile {
  id: string;
  name: string;
  email: string;
  unit_number: string;
  phone?: string;
  vehicle_plate?: string;
  role: 'resident' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  sessionError: string | null;
  refreshSession: () => Promise<any>;
}

// ============================================================================
// CONTEXT SETUP
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthWrapper');
  }
  return context;
}

// ============================================================================
// AUTH WRAPPER COMPONENT
// ============================================================================

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const router = useRouter();

  // ============================================================================
  // INITIALIZE AUTH & SESSION MONITORING
  // ============================================================================
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    const init = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setSessionError(error.message);
        }

        setUser(session?.user || null);
        setLoading(false);

        // Set up periodic session checks every 5 minutes
        if (session) {
          sessionCheckInterval = setInterval(async () => {
            const { data: { session: currentSession }, error: refreshError } = 
              await supabase.auth.getSession();
            
            if (!currentSession || refreshError) {
              console.log("Session expired or error, redirecting to login");
              await supabase.auth.signOut();
              router.replace("/login");
            }
          }, 5 * 60 * 1000); // 5 minutes
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setSessionError("Authentication initialization failed");
        setLoading(false);
      }
    };
    
    init();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (!session) {
          setUser(null);
          setProfile(null);
          router.replace("/login");
        }
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setUser(session?.user || null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [router]);

  // ============================================================================
  // FETCH USER PROFILE
  // ============================================================================
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setProfileLoading(true);
        try {
          const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Profile fetch error:", error);
            if (error.code === 'PGRST116') {
              console.log("Profile not found - might need profile setup");
            }
            setProfile(null);
          } else {
            setProfile(data);
          }
        } catch (err) {
          console.error("Profile fetch exception:", err);
          setProfile(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
        if (!loading) {
          router.replace("/login");
        }
      }
    };
    
    fetchProfile();
  }, [user, router, loading]);

  // ============================================================================
  // MANUAL SESSION REFRESH
  // ============================================================================
  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error("Failed to refresh session:", error);
      await supabase.auth.signOut();
      router.replace("/login");
      return null;
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const value: AuthContextType = { 
    user, 
    profile, 
    loading: loading || profileLoading,
    sessionError,
    refreshSession
  };

  // ============================================================================
  // RENDER STATES
  // ============================================================================

  // Show error state if there's a session error
  if (sessionError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Session Error</h2>
          <p className="text-red-600 mb-4">{sessionError}</p>
          <button
            onClick={() => {
              setSessionError(null);
              window.location.href = '/login';
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no user
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to login...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show profile loading state
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Render children with context
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

```typescript
// ./components/common/ErrorDisplay.tsx (Size: 4.0K)

// components/ErrorDisplay.tsx
// Reusable error display component
"use client";

interface ErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorDisplay({ error, onRetry, className = "" }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <svg 
          className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
        <div className="flex-1">
          <strong className="text-red-800">Error:</strong>
          <p className="text-red-700 mt-1">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Success message component as a bonus
interface SuccessMessageProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessMessage({ message, onDismiss, className = "" }: SuccessMessageProps) {
  if (!message) return null;

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <svg 
          className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <div className="flex-1">
          <p className="text-green-800">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
```

```typescript
// ./components/common/Navigation.tsx (Size: 8.0K)

// components/common/Navigation.tsx
"use client";

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthWrapper';
import { useState } from 'react';
import { supabase } from "@/lib/supabase";

export default function Navigation() {
  const { profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <svg 
                className="w-8 h-8 text-blue-600 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-bold text-xl text-gray-900">ParkBoard</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link 
              href="/slots" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              Browse Slots
            </Link>
            <Link 
              href="/slots/new" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              List Your Slot
            </Link>
            <Link 
              href="/bookings" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              My Bookings
            </Link>
            {/* User info and sign out */}
            {profile && (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{profile.name}</div>
                  <div className="text-gray-500">Unit {profile.unit_number}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {!menuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {profile && (
              <div className="px-3 py-2 mb-2 bg-gray-50 rounded-md">
                <div className="text-sm font-medium text-gray-900">{profile.name}</div>
                <div className="text-xs text-gray-500">Unit {profile.unit_number}</div>
              </div>
            )}
            
            <Link
              href="/slots"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              Browse Slots
            </Link>
            <Link
              href="/slots/new"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              List Your Slot
            </Link>
            <Link
              href="/bookings"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              My Bookings
            </Link>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
```

```typescript
// ./components/common/ToastNotification.tsx (Size: 8.0K)

// components/common/ToastNotification.tsx
// Non-blocking toast notification system
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

// ============================================================================
// CONTEXT SETUP
// ============================================================================

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// TOAST PROVIDER COMPONENT
// ============================================================================

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000, // Default 5 seconds
    };

    setToasts((prev) => {
      const updated = [...prev, newToast];
      // Keep only the latest N toasts
      return updated.slice(-maxToasts);
    });

    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }
  }, [maxToasts, dismissToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title: title || 'Error', duration: 7000 });
  }, [showToast]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title: title || 'Success', duration: 4000 });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title: title || 'Warning', duration: 5000 });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title: title || 'Info', duration: 4000 });
  }, [showToast]);

  const value: ToastContextType = {
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    dismissToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// TOAST CONTAINER COMPONENT
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ============================================================================
// TOAST ITEM COMPONENT
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { type, title, message, action, id } = toast;

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      text: 'text-green-800',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      text: 'text-red-800',
      iconPath: 'M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-800',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-800',
      iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  };

  const style = styles[type];

  return (
    <div
      className={`${style.bg} border ${style.border} rounded-lg p-4 shadow-lg pointer-events-auto animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <svg
          className={`w-5 h-5 ${style.icon} flex-shrink-0 mt-0.5`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={style.iconPath}
          />
        </svg>

        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-semibold ${style.text} mb-1`}>{title}</h4>
          )}
          <p className={`text-sm ${style.text}`}>{message}</p>

          {action && (
            <button
              onClick={() => {
                action.onClick();
                onDismiss(id);
              }}
              className={`mt-2 text-sm font-medium ${style.text} underline hover:no-underline`}
            >
              {action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onDismiss(id)}
          className={`${style.icon} hover:opacity-70 flex-shrink-0`}
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Add animation to globals.css:
// @keyframes slide-in-right {
//   from { transform: translateX(100%); opacity: 0; }
//   to { transform: translateX(0); opacity: 1; }
// }
// .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
```

```typescript
// ./components/ErrorBoundary.tsx (Size: 4.0K)

// =====================================================
// File: components/ErrorBoundary.tsx
// React Error Boundary for crash protection
// =====================================================
"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    // You could send error to logging service here
    // Example: logErrorToService(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h2>
            
            <p className="text-gray-600 text-center mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


```

```typescript
// ./components/ui/alert.tsx (Size: 4.0K)

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }

```

```typescript
// ./components/ui/badge.tsx (Size: 4.0K)

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

```

```typescript
// ./components/ui/button.tsx (Size: 4.0K)

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

```typescript
// ./components/ui/card.tsx (Size: 4.0K)

import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```

```typescript
// ./components/ui/input.tsx (Size: 4.0K)

import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

```

```typescript
// ./components/ui/tabs.tsx (Size: 4.0K)

"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

```

### Library Files

## Configuration Files

```javascript
// tailwind.config.js (Size: 4.0K)

// tailwind.config.js - Updated for Tailwind v4
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

```json
// tsconfig.json (Size: 4.0K)

{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "esModuleInterop": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "strictNullChecks": true,
    
    // <-- Add these
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "_deprecated",
    "_archived",
    "**/*.backup.*"
  ]
}

```

```json
// components.json (Size: 4.0K)

{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

```javascript
// postcss.config.js (Size: 4.0K)

// =====================================================
// File: postcss.config.js
// Required for Tailwind CSS to work properly
// =====================================================
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Environment Configuration

### .env

```bash
NEXT_PUBLIC_SUPABASE_URL=***REDACTED***
SUPABASE_ANON_KEY=***REDACTED***
```

### .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=***REDACTED***
NEXT_PUBLIC_SUPABASE_ANON_KEY=***REDACTED***
SUPABASE_SERVICE_ROLE_KEY=***REDACTED***
NEXT_PUBLIC_DEV_MODE=***REDACTED***

```

## Dependencies & Package Info

```json
// package.json (Size: 4.0K)

{
  "name": "parkboard",
  "version": "1.1.0",
  "description": "ParkBoard is a minimal parking booking web app for a small, vetted condo community. It follows a hotel-booking pattern (users, parking slots, bookings) and is built as an MVP using Supabase + Next.js + Tailwind.",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/alfieprojectsdev/parkboard.git"
  },
  "keywords": [
    "parking",
    "booking",
    "condo",
    "management"
  ],
  "author": "",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/alfieprojectsdev/parkboard/issues"
  },
  "homepage": "https://github.com/alfieprojectsdev/parkboard#readme",
  "dependencies": {
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "@supabase/ssr": "^0.0.10",
    "@supabase/supabase-js": "^2.58.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.303.0",
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^14.3.1",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^5.0.4",
    "autoprefixer": "^10.4.16",
    "babel-jest": "^29.7.0",
    "jest": "^29.7.0",
    "jsdom": "^27.0.0",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0",
    "vitest": "^3.2.4"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}

```

```json
// package-lock.json (simplified)
// Failed to parse
```

## Documentation

```markdown
// CLAUDE.md (Size: 12K)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ParkBoard** is a parking slot booking system for residential condominiums, built as an MVP using Next.js 15, Supabase (PostgreSQL), and TypeScript. It follows a hotel-booking pattern with users, parking slots, and bookings, featuring a mixed ownership model (owned + shared slots).

**Current Status**: MVP 1.1 - Production Ready

## Key Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server at http://localhost:3000
npm run build           # Production build
npm start               # Start production server
```

### Testing
```bash
npm test                # Run Jest unit tests
npm run test:e2e        # Run Playwright e2e tests
npm run type-check      # TypeScript type checking without emit
```

### Linting
```bash
npm run lint            # Run Next.js linter
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS v3, shadcn/ui components
- **Backend**: Next.js API routes (server-side)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth (extends `auth.users`)

### Critical Directory Structure
```
app/
├── api/                    # Server-side API routes
│   ├── bookings/          # Booking CRUD with overlap checking
│   ├── slots/             # Slot management (admin only)
│   ├── profiles/          # User profile management
│   └── payments/          # Payment handling (future)
├── admin/                 # Admin dashboard and management pages
├── bookings/              # User booking pages
├── dashboard/             # User dashboard
├── login/                 # Auth pages
└── reset-password/        # Password reset flow

components/
├── auth/                  # AuthWrapper (context provider), auth forms
├── booking/               # BookingForm, SlotGrid, TimeRangePicker
├── common/                # Navigation, ErrorDisplay, shared components
├── admin/                 # Admin-specific components
├── dashboard/             # Dashboard components
└── ui/                    # shadcn/ui primitives (Button, Card, etc.)

lib/
├── supabase.ts           # Client-side Supabase client (anon key)
├── supabaseServer.ts     # Server-side Supabase client (service role)
├── constants.ts          # Business rules (BOOKING_RULES, etc.)
└── utils.ts              # Utility functions

db/
├── schema.sql            # Canonical schema (v3 unified with ownership)
├── rls_policies.sql      # Row Level Security policies
├── migrations/           # Schema migration scripts
└── useful_queries.sql    # Common queries for debugging
```

### Database Schema (Core Tables)

**`user_profiles`** (extends `auth.users`)
- Primary Key: `id` (uuid, FK to `auth.users`)
- Fields: `name`, `unit_number`, `email`, `phone`, `vehicle_plate`, `role` ('resident' | 'admin')
- **Important**: NEVER modify `auth.users` directly - always use `user_profiles`

**`parking_slots`**
- Primary Key: `slot_id` (serial)
- Unique: `slot_number`
- Fields: `slot_type` ('covered' | 'uncovered' | 'visitor'), `status` ('available' | 'maintenance' | 'reserved')
- **Ownership**: `owner_id` (uuid, nullable) - NULL means shared/visitor slot
- Owned slots can only be booked by the owner; shared slots (owner_id IS NULL) can be booked by anyone

**`bookings`**
- Primary Key: `booking_id` (serial)
- Foreign Keys: `user_id` (auth.users), `slot_id` (parking_slots)
- Fields: `start_time`, `end_time` (TIMESTAMPTZ in UTC), `status` ('confirmed' | 'cancelled' | 'completed' | 'no_show'), `notes`
- **Constraints**: Overlap checking enforced at API level, not database level

**`payments`** (optional, for future use)
- Links to bookings for payment tracking

### Authentication & Authorization Flow

1. **Client-side Auth**: `AuthWrapper.tsx` provides React Context with `user`, `profile`, `loading`, `sessionError`
2. **Session Management**: Periodic session checks (5 min interval), automatic refresh
3. **API Authentication**: API routes use either:
   - Anon key (client operations with RLS)
   - Service role key (server operations bypassing RLS for validation)
4. **RLS Policies**: Enforce data access at database level
   - Users see only their own data
   - Admins have broader SELECT/UPDATE access
   - Ownership rules enforced in booking INSERT policy

### Business Rules (Frozen for 30 Days - See `parkboard_mvp_plan.md`)

**Booking Constraints** (defined in `lib/constants.ts`):
```typescript
BOOKING_RULES = {
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 24,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_GRACE_HOURS: 1,
}
```

**Validation Layer**:
- **Client-side**: `BookingForm.tsx` validates before API call
- **Server-side**: `/api/bookings` route validates and enforces overlap checking
- Always mirror server-side validation logic when updating UI

**Slot Ownership Rules**:
- Users can only book slots they own (`owner_id = user_id`) OR shared slots (`owner_id IS NULL`)
- Enforced at RLS level and validated in `/api/bookings` route
- UI displays "Your Slot" badge for owned slots in `SlotGrid.tsx`

### Common Workflows

#### Creating/Updating a Booking
1. User selects time range in `TimeRangePicker.tsx`
2. `SlotGrid.tsx` queries available slots (filters by availability + ownership)
3. User selects slot, `BookingForm.tsx` validates rules
4. POST to `/api/bookings` with overlap checking
5. Server validates ownership, checks conflicts, inserts booking

#### Admin Operations
- Admin routes in `app/admin/` require `role = 'admin'` check
- Use `AdminDashboardContent.tsx` as reference for admin data fetching
- Admin operations bypass some RLS policies but should respect business rules

### Important Files to Read First

When working on a feature, start with these:

**Database/Schema**:
- `db/schema.sql` - Canonical schema
- `db/rls_policies.sql` - Security policies
- `db/useful_queries.sql` - Debugging queries

**API Layer**:
- `app/api/bookings/route.ts` - Booking logic with validation
- `app/api/slots/route.ts` - Slot management
- `app/api/profiles/route.ts` - Profile CRUD

**Core Components**:
- `components/auth/AuthWrapper.tsx` - Auth context provider
- `components/booking/BookingForm.tsx` - Booking creation flow
- `components/booking/SlotGrid.tsx` - Slot selection with ownership display
- `app/admin/AdminDashboardContent.tsx` - Admin data fetching patterns

### Critical Patterns & Conventions

#### Supabase Client Usage
```typescript
// Client-side (with RLS)
import { supabase } from '@/lib/supabase'; // Uses NEXT_PUBLIC_SUPABASE_ANON_KEY

// Server-side (bypasses RLS - use cautiously)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Rule**: Use service role key ONLY in API routes for validation logic. Never expose it to client.

#### Timezone Handling
- Database stores all timestamps as `TIMESTAMPTZ` (UTC)
- Convert to local timezone ONLY when rendering in UI
- API routes work with ISO 8601 strings

#### Component Reuse
- **Extend existing components** rather than duplicating
- Key reusable components: `AuthWrapper`, `Navigation`, `ErrorDisplay`, `BookingForm`, `SlotGrid`
- shadcn/ui components in `components/ui/` are customizable

#### Path Aliases
```typescript
import { supabase } from '@/lib/supabase';  // '@/' resolves to project root
import { useAuth } from '@/components/auth/AuthWrapper';
```

### Pitfalls & Guardrails

1. **DO NOT modify `auth.users` directly** - Use `user_profiles` table
2. **RLS is the security boundary** - Do not bypass in client code
3. **Service role key = trusted code only** - Already used in some API routes; follow existing patterns
4. **Business rules are frozen for 30 days** - Do not change schema or booking constraints without explicit approval
5. **Overlap checking is server-side** - Trust the API, not the UI state
6. **Type safety**: TypeScript `strict: false` in config, but use types where possible
7. **Keep changes small and reversible** - Prefer adding helpers over large refactors during MVP phase

### Testing Approach

- **Unit Tests**: Use Jest for component logic (`tests/unit/`)
- **E2E Tests**: Use Playwright for critical flows (`tests/e2e.spec.ts`)
- **Manual Testing**: Follow `docs/merged_qa_checklist.md` for comprehensive QA
- **Test Data**: Use `db/fixed_development_seed.sql` for consistent test data

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Server-side only
```

### Common Debugging Queries

See `db/useful_queries.sql` for examples:
- View all bookings with slot details
- Check slot ownership
- Identify booking conflicts
- Audit user roles

### Additional Context

- **Mobile Responsive**: All UI components are mobile-first (Tailwind breakpoints)
- **Error Handling**: Use `ErrorDisplay` component for consistent error messages
- **Loading States**: Always show loading indicators during async operations
- **Success Feedback**: Use `SuccessMessage` component after mutations

### When Making Changes

1. **Read the existing code first** - Understand patterns before implementing
2. **Check business rules** - Refer to `lib/constants.ts` and `parkboard_mvp_plan.md`
3. **Test both client and server** - Validation must match on both sides
4. **Verify RLS policies** - Ensure changes don't bypass security
5. **Update types** - Keep TypeScript definitions in sync
6. **Keep it minimal** - MVP phase prioritizes working code over perfect code

### Support & Documentation

- **Planning Docs**: `docs/parkboard_mvp_plan.md`, `docs/businessflows.md`
- **QA Checklist**: `docs/merged_qa_checklist.md`
- **ERD**: `docs/ERD.md`
- **Progress Tracking**: `docs/progress.md`
```

```markdown
// ./docs/00_20251003_131248_file_manifest.md.md (Size: 4.0K)

# 📦 Minimal MVP File Manifest

**Branch:** `mvp-minimal-launch`  
**Created:** 2025-01-03 16:31:00  
**Purpose:** Track all files for 24-hour MVP launch

---

## 📋 **File Naming Convention**

```
[N]_[YYYYMMDD]_[HHmmss].<ext>

Where:
- N = Sequential number (00, 01, 02...)
- YYYYMMDD = Date (20250103)
- HHmmss = Time in 24hr format (163000)
- ext = File extension (sql, tsx, md, etc.)
```

---

## 📁 **Generated Files**

| # | Filename | Type | Status | Purpose |
|---|----------|------|--------|---------|
| 00 | `00_20251003_131248_file_manifest.md` | Doc | ✅ Done | This file - tracks all artifacts |
| 01 | `01_20251003_131132_minimal_schema.sql` | SQL | ✅ Done | Nuclear clean database schema |
| 02 | `02_20251003_130106_mvp_launch_checklist.md` | Doc | ✅ Done | Step-by-step launch guide |
| 03 | `03_20251003_1350SS_marketplace_browse.tsx` | TSX | ✅ Done | Browse available slots |
| 04 | `04_20251003_1350SS_marketplace_book.tsx` | TSX | ✅ Done | Book a specific slot |
| 05 | `05_20251003_1350SS_owner_dashboard.tsx` | TSX | ✅ Done | View slots + bookings |
| 06 | `06_20251003_1350SS_owner_list_slot.tsx` | TSX | ✅ Done | Create new slot listing |
| 07 | `07_20251003_1400SS_onboarding_simple.tsx` | TSX | ✅ NEW | User type selection |

---
```
## 🎯 **Files Still Needed**

| # | Filename | Type | Status | Purpose |
|---|----------|------|--------|---------|

```
---

## 🗂️ **Where Files Go**

```
parkboard/
├── db/
│   └── migrations/
│       └── 01_20250103_163000_minimal_schema.sql      ← Run in Supabase
├── docs/
│   ├── 00_20250103_163100_file_manifest.md            ← This file
│   └── 02_20250103_HHMMSS_mvp_launch_checklist.md    ← Reference guide
└── app/
    ├── marketplace/
    │   ├── page.tsx                                    ← 03_marketplace_browse
    │   └── [slotId]/
    │       └── page.tsx                                ← 04_marketplace_book
    └── owner/
        ├── page.tsx                                    ← 05_owner_dashboard
        └── setup/
            └── page.tsx                                ← 06_owner_list_slot
```

---

## ✅ **Completed Steps**

- [x] Created branch safety strategy
- [x] Generated nuclear clean database schema
- [x] Created launch checklist
- [x] Established file naming convention
- [x] Created file tracking manifest

---

## ⏳ **Next Steps**

1. Run `01_20250103_163000_minimal_schema.sql` in Supabase
2. Request UI page generation (files 03-06)
3. Copy pages to correct locations
4. Test locally
5. Deploy
6. Get first users

---

## 🎯 **Request Format**

When requesting next files, say:

**"Generate files 03-06"** (all UI pages)

OR individually:

**"Generate file 03"** (marketplace browse)  
**"Generate file 04"** (booking form)  
**"Generate file 05"** (owner dashboard)  
**"Generate file 06"** (list slot form)

---

## 📊 **Progress Tracker**

**Database:** ✅ Done (1/1)  
**Documentation:** ✅ Done (2/2)  
**UI Pages:** ✅ Done (0/4)  
**Overall:** 60% Complete

**Estimated time to complete:** 30-45 minutes  
**Estimated time to launch:** 2-4 hours

---

## 💾 **Backup Status**

- [x] Main branch pushed
- [x] mvp-minimal-launch created
- [x] v1.0-feature-complete tag created
- [ ] Nuclear schema applied (waiting for confirmation)

**Your 12 months of work is SAFE on main branch.**

---

Ready to generate the UI files when you are! 🚀
```

```markdown
// ./docs/02_20251003_130106_mvp_launch_checklist.md (Size: 8.0K)

# 🚀 Minimal MVP Launch Checklist

## ✅ **PRE-LAUNCH (Do This First)**

### **1. Branch Safety (5 minutes)**
```bash
# Save current work
git add .
git commit -m "Save complete feature set before simplification"
git push origin main

# Create minimal branch
git checkout -b mvp-minimal-launch

# Tag for safety
git tag -a v1.0-feature-complete -m "Full version before simplification"
git push origin v1.0-feature-complete
```

### **2. Database Reset (10 minutes)**
- [x] Run `01_minimal_schema.sql` in Supabase SQL Editor
- [x] Verify 3 tables exist: user_profiles, parking_slots, bookings
- [x] Check RLS is enabled on all 3 tables
- [x] Confirm 5 policies exist (not 30+)

### **3. Clean Up Code (15 minutes)**
- [x] Delete these entire folders:
  - `app/owner/earnings/`
  - `app/owner/settings/`
  - `app/owner/slots/[slotId]/edit/`
  - `db/migrations/viber-migration-updates*.sql`
  - `db/migrations/*marketplace*.sql`

### **4. Replace Core Pages (30 minutes)**
Need these 5 files (I'll generate on request):
- [X] `app/marketplace/page.tsx` - Browse slots (SIMPLE)
- [X] `app/marketplace/[slotId]/page.tsx` - Book a slot (SIMPLE)  
- [X] `app/owner/page.tsx` - View my slots + bookings (SIMPLE)
- [X] `app/owner/setup/page.tsx` - List a slot (SIMPLE)
- [X] `app/onboarding/page.tsx` - Choose owner or renter (KEEP)

---

## 🧪 **TESTING (1-2 hours)**

### **Test Flow 1: Owner Journey**
- [ ] Sign up as owner@test.com
- [ ] Choose "I own a slot"
- [ ] List a slot (A-101, covered, ₱50/hr)
- [ ] See it on owner dashboard
- [ ] Verify it shows in marketplace

### **Test Flow 2: Renter Journey**  
- [ ] Sign up as renter@test.com
- [ ] Choose "I want to rent"
- [ ] Browse marketplace
- [ ] Click a slot
- [ ] Fill booking form
- [ ] Submit booking
- [ ] Check /bookings page

### **Test Flow 3: Owner Sees Booking**
- [ ] Log back in as owner
- [ ] Go to /owner
- [ ] See pending booking request
- [ ] Owner has renter's contact info

---

## 🚀 **DEPLOYMENT (30 minutes)**

### **Deploy to Vercel**
```bash
# Commit changes
git add .
git commit -m "Minimal MVP - ready to launch"
git push origin mvp-minimal-launch

# Deploy
vercel --prod

# Or link to Vercel dashboard
```

### **Environment Variables**
Make sure Vercel has:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 👥 **GET FIRST USERS (Same day!)**

### **Immediate Actions:**
- [ ] Walk to 3 neighbor's doors
- [ ] Say: "I built a parking booking app for our building. Can you try it?"
- [ ] Watch them use it
- [ ] Take notes on what confuses them
- [ ] Fix TOP 3 confusions only

### **DO NOT:**
- ❌ Explain how it works
- ❌ Add features they mention
- ❌ Fix every tiny bug
- ❌ Wait for perfection

### **DO:**
- ✅ Watch them struggle
- ✅ Note where they get stuck
- ✅ Ask "what did you expect to happen?"
- ✅ Thank them for testing

---

## 📊 **SUCCESS METRICS (First 48 Hours)**

### **Minimum Viable Success:**
- [ ] 3 people signed up
- [ ] 2 slots listed
- [ ] 1 booking made
- [ ] 0 critical bugs (app doesn't crash)

### **NOT Success Metrics:**
- ❌ Perfect code
- ❌ All features working
- ❌ Beautiful UI
- ❌ Zero bugs

---

## 🎯 **WHAT TO DO AFTER LAUNCH**

### **Week 1: Listen**
- Collect feedback
- Note most requested feature
- DON'T BUILD IT YET

### **Week 2: Analyze**
- Do 5+ people want the same thing?
- Is it core to booking a parking spot?
- Can you build it in 4 hours?

### **Week 3: Build ONE Feature**
- The most requested one
- Ship it
- Get feedback again

---

## 🔄 **LEARNING FROM YOUR FULL CODE**

Your `main` branch has tons of code. Here's how to use it:

### **When Users Ask For A Feature:**
1. Check if it exists in `main` branch
2. Cherry-pick that specific code:
```bash
# On mvp-minimal-launch branch
git checkout main -- app/owner/earnings/

# Test it
# If it works, commit
# If not, delete and rebuild simpler
```

### **What To Cherry-Pick First (If Users Want It):**
1. Earnings tracking (owners want to see money)
2. Edit slot details (owners make mistakes)
3. Complex availability (only if users complain current system too simple)

### **What To NEVER Cherry-Pick:**
- Viber migration features (technical debt)
- Multiple RLS recursion fixes (over-engineered)
- Anything you don't understand from main

---

## ⚠️ **COMMON PITFALLS**

### **"But I Need To Add..."**
**STOP.** You don't. Users will tell you what they need.

### **"This Bug Is Critical..."**
Is the app completely broken? No? Then it's not critical.

### **"I Should Make It Pretty..."**
Ugly and working beats pretty and never launching.

### **"What If Users Don't Like It..."**
Then you'll learn what they DO want. That's the whole point.

---

## 🎉 **WHEN YOU'VE LAUNCHED**

Take a screenshot of your first booking.  
Print it out.  
Put it on your wall.

**You spent 12 months building. You finally shipped.**

That's worth celebrating.

---

## 📞 **WHAT FILES DO YOU NEED?**

Tell me which pages to generate and I'll create them:

1. Simplified marketplace browse? 
2. Simplified booking form?
3. Simplified owner dashboard?
4. Simplified slot listing form?
5. All of the above?

**Your full code is safe on `main`. Let's ship this.**
```

```markdown
// ./docs/20251003_130000_emergency_mvp_plan.md (Size: 16K)

# 🚨 24-Hour Emergency MVP Launch Plan

## ⚠️ **Reality Check First**

You've spent 12 months building. **You need to ship NOW, not perfect later.**

This plan will hurt. You'll cut features you love. But you'll LAUNCH.

---

## 🔥 **The Nuclear Option: Radical Simplification**

### **Option A: Strip Current Codebase (Recommended)**
Keep what works, delete everything else.

### **Option B: Start Fresh from Original MVP**
Go back to October 2024 vision, build ONLY that.

**I recommend Option A** - you have working code, just cut the complexity.

---

## 📋 **OPTION A: Emergency Triage (Next 24 Hours)**

### **Hour 0-2: DELETE EVERYTHING YOU DON'T NEED**

#### **Files to DELETE Completely:**
```bash
# Delete these entire directories
rm -rf app/owner/earnings
rm -rf app/owner/settings
rm -rf app/owner/slots/[slotId]/edit

# Delete complex features
rm db/migrations/viber-migration-updates*.sql
rm db/migrations/*marketplace*.sql
rm db/rls_policies_consolidated.sql

# Keep only:
# - app/marketplace/page.tsx (simplified)
# - app/marketplace/[slotId]/page.tsx (booking form)
# - app/owner/page.tsx (list slots only)
# - app/owner/setup/page.tsx (create slot)
```

#### **Database: Keep ONLY These Tables:**
```sql
-- ABSOLUTE MINIMUM SCHEMA (run this to reset)

-- 1. user_profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  user_type TEXT CHECK (user_type IN ('owner', 'renter')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. parking_slots (SIMPLIFIED)
CREATE TABLE parking_slots (
  slot_id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES user_profiles(id),
  slot_number TEXT NOT NULL,
  slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered')),
  description TEXT,
  price_per_hour DECIMAL(10,2),
  contact_info TEXT,  -- Just text, user writes whatever
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. bookings (SIMPLIFIED)
CREATE TABLE bookings (
  booking_id SERIAL PRIMARY KEY,
  renter_id UUID REFERENCES user_profiles(id),
  slot_id INTEGER REFERENCES parking_slots(slot_id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_price DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- THAT'S IT. Nothing else.
```

**Delete these tables entirely:**
- slot_availability_windows ❌
- slot_blackout_dates ❌
- slot_rental_settings ❌
- slot_earnings ❌
- viber_migration_metrics ❌
- payments ❌

---

### **Hour 2-4: Simplify RLS (Copy-Paste This)**

```sql
-- SIMPLE RLS - No recursion, no complexity

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- user_profiles: users see their own
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid());

-- parking_slots: everyone can read, owners can write
CREATE POLICY "anyone_read_slots" ON parking_slots
  FOR SELECT USING (true);

CREATE POLICY "owners_write_slots" ON parking_slots
  FOR ALL USING (owner_id = auth.uid());

-- bookings: renters see their own, owners see their slots
CREATE POLICY "renters_own_bookings" ON bookings
  FOR ALL USING (renter_id = auth.uid());

CREATE POLICY "owners_see_bookings" ON bookings
  FOR SELECT USING (
    slot_id IN (SELECT slot_id FROM parking_slots WHERE owner_id = auth.uid())
  );

-- DONE. That's all the RLS you need.
```

---

### **Hour 4-8: Strip Features from UI**

#### **app/marketplace/page.tsx - MINIMAL VERSION:**
```typescript
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

export default function MarketplacePage() {
  return (
    <AuthWrapper>
      <Navigation />
      <MarketplaceContent />
    </AuthWrapper>
  );
}

function MarketplaceContent() {
  const router = useRouter();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    const { data } = await supabase
      .from('parking_slots')
      .select('*, user_profiles(name, phone)')
      .eq('is_available', true);
    setSlots(data || []);
    setLoading(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Available Parking Slots</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot) => (
          <div key={slot.slot_id} className="border rounded-lg p-4 hover:shadow-lg cursor-pointer"
               onClick={() => router.push(`/marketplace/${slot.slot_id}`)}>
            <h3 className="text-xl font-bold">{slot.slot_number}</h3>
            <p className="text-gray-600">{slot.slot_type}</p>
            <p className="text-lg font-semibold text-green-600">
              ₱{slot.price_per_hour}/hour
            </p>
            <p className="text-sm text-gray-500 mt-2">{slot.description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
```

#### **app/marketplace/[slotId]/page.tsx - MINIMAL BOOKING:**
```typescript
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

export default function BookSlotPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <BookSlotContent />
    </AuthWrapper>
  );
}

function BookSlotContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [slot, setSlot] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSlot();
  }, []);

  const fetchSlot = async () => {
    const { data } = await supabase
      .from('parking_slots')
      .select('*, user_profiles(name, phone)')
      .eq('slot_id', params.slotId)
      .single();
    setSlot(data);
  };

  const handleBook = async () => {
    if (!startTime || !endTime) {
      alert('Please select start and end times');
      return;
    }

    setLoading(true);
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = (end - start) / (1000 * 60 * 60);
    const totalPrice = hours * parseFloat(slot.price_per_hour);

    const { error } = await supabase
      .from('bookings')
      .insert({
        renter_id: user.id,
        slot_id: slot.slot_id,
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        status: 'pending'
      });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Booking request sent! Owner will be notified.');
      router.push('/bookings');
    }
    setLoading(false);
  };

  if (!slot) return <div className="p-8">Loading...</div>;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <button onClick={() => router.back()} className="mb-4 text-blue-600">
        ← Back
      </button>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-4">{slot.slot_number}</h1>
        <p className="text-xl mb-2">₱{slot.price_per_hour}/hour</p>
        <p className="text-gray-600 mb-4">{slot.description}</p>

        <div className="border-t pt-4 mb-6">
          <h3 className="font-semibold mb-2">Owner Contact:</h3>
          <p>{slot.user_profiles?.name}</p>
          <p>{slot.user_profiles?.phone}</p>
          <p className="text-sm text-gray-600 mt-2">{slot.contact_info}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <button
            onClick={handleBook}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Booking...' : 'Request Booking'}
          </button>
        </div>
      </div>
    </main>
  );
}
```

#### **app/owner/page.tsx - JUST LIST YOUR SLOTS:**
```typescript
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

export default function OwnerDashboardPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <OwnerDashboardContent />
    </AuthWrapper>
  );
}

function OwnerDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Get my slots
    const { data: slotsData } = await supabase
      .from('parking_slots')
      .select('*')
      .eq('owner_id', user.id);
    setSlots(slotsData || []);

    // Get bookings for my slots
    if (slotsData && slotsData.length > 0) {
      const slotIds = slotsData.map(s => s.slot_id);
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, user_profiles(name, phone)')
        .in('slot_id', slotIds)
        .eq('status', 'pending');
      setBookings(bookingsData || []);
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Parking Slots</h1>
        <button
          onClick={() => router.push('/owner/setup')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Slot
        </button>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">You haven't listed any slots yet</p>
          <button
            onClick={() => router.push('/owner/setup')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            List Your First Slot
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 mb-8">
            {slots.map((slot) => (
              <div key={slot.slot_id} className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xl font-bold">{slot.slot_number}</h3>
                <p>₱{slot.price_per_hour}/hour</p>
                <p className="text-sm text-gray-600">{slot.description}</p>
              </div>
            ))}
          </div>

          {bookings.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Pending Booking Requests</h2>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.booking_id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="font-semibold">{booking.user_profiles?.name}</p>
                    <p className="text-sm">{booking.user_profiles?.phone}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(booking.start_time).toLocaleString()} - 
                      {new Date(booking.end_time).toLocaleString()}
                    </p>
                    <p className="font-semibold">₱{booking.total_price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
```

---

### **Hour 8-12: Test & Fix Critical Bugs Only**

**Test ONLY these flows:**
1. ✅ Sign up
2. ✅ List a slot
3. ✅ Browse marketplace
4. ✅ Book a slot
5. ✅ See your bookings

**DO NOT test or fix:**
- ❌ Complex availability
- ❌ Earnings tracking
- ❌ Settings pages
- ❌ Edit functionality
- ❌ Anything else

---

### **Hour 12-16: Deploy**

```bash
# Push to production
git add .
git commit -m "EMERGENCY MVP - stripped to essentials"
git push

# Deploy to Vercel
vercel --prod

# Done.
```

---

### **Hour 16-24: Get Your First 5 Users**

**Literally walk to 5 neighbors and ask them to try it.**

Don't wait for perfection. Get feedback NOW.

---

## 🔥 **What You're CUTTING**

| Feature | Status |
|---------|--------|
| Complex availability windows | ❌ GONE |
| Blackout dates | ❌ GONE |
| Quick "Available NOW" | ❌ GONE |
| Slot earnings tracking | ❌ GONE |
| Owner settings page | ❌ GONE |
| Slot edit functionality | ❌ GONE |
| Viber migration features | ❌ GONE |
| Payment integration | ❌ GONE |
| Advanced RLS policies | ❌ GONE |
| Multiple dashboards | ❌ GONE |

---

## 💎 **What You're KEEPING**

| Feature | Status |
|---------|--------|
| List parking slot | ✅ KEEP |
| Browse marketplace | ✅ KEEP |
| Book a slot | ✅ KEEP |
| See bookings | ✅ KEEP |
| Basic authentication | ✅ KEEP |
| Simple UI | ✅ KEEP |

---

## 🎯 **SUCCESS METRICS (24 Hours)**

**By tomorrow, you should have:**
- [ ] Deployed to production
- [ ] 5 people tested it
- [ ] 2 successful bookings made
- [ ] Feedback collected

**NOT:**
- ❌ Perfect code
- ❌ All features working
- ❌ Zero bugs

---

## 💬 **The Tough Love Speech**

You've been building for 12 months. **You need to stop building and start learning.**

The ONLY way to know if ParkBoard works is to **put it in front of users.**

All those features you built? You don't know if users even want them.

**Ship the MVP. Get feedback. Then build v2 based on REAL USER NEEDS.**

---

## ⚠️ **The Alternative (If You Can't Cut)**

If you truly can't bring yourself to delete code:

1. **Create a new branch:** `git checkout -b mvp-minimal`
2. **Keep current code safe:** Your work isn't lost
3. **Build minimal version:** In the new branch
4. **Launch minimal:** Get users
5. **Merge features back:** ONLY the ones users ask for

---

## 🚨 **Final Warning**

If you don't launch in the next 48 hours, **you probably never will.**

The longer you wait, the more "one more feature" you'll add.

**Shipping beats perfecting. Always.**

---

**Do you want me to generate the complete minimal codebase right now?** 

I can give you:
- Minimal schema SQL (ready to run)
- 3 simplified pages (copy-paste ready)
- Simple RLS policies
- Deployment checklist

**This will hurt. But you'll ship.**

What do you say?
```

```markdown
// ./docs/files_03_06_summary.md (Size: 12K)

# 📦 Files 03-06: Implementation Summary

**Generated:** 2025-10-03 13:50  
**Status:** ✅ All 4 TSX files complete and aligned with MVP launch plan

---

## ✅ **Consistency Verification**

### **Against `01_minimal_schema.sql`**
| Component | Schema Alignment | Notes |
|-----------|------------------|-------|
| **user_profiles** | ✅ Perfect | Uses `id`, `name`, `email`, `phone` |
| **parking_slots** | ✅ Perfect | All fields match: `slot_id`, `owner_id`, `slot_number`, `slot_type`, `description`, `price_per_hour`, `contact_info`, `is_available` |
| **bookings** | ✅ Perfect | Uses `booking_id`, `renter_id`, `slot_id`, `start_time`, `end_time`, `total_price`, `status` |

### **Against `MVP_LAUNCH_CHECKLIST.md`**
| Requirement | File | Status |
|-------------|------|--------|
| Browse slots (SIMPLE) | File 03 | ✅ Implemented |
| Book a slot (SIMPLE) | File 04 | ✅ Implemented |
| View my slots + bookings (SIMPLE) | File 05 | ✅ Implemented |
| List a slot (SIMPLE) | File 06 | ✅ Implemented |
| No complex features | All files | ✅ Zero complexity |
| No localStorage/sessionStorage | All files | ✅ Uses Supabase only |

---

## 📁 **File Deployment Map**

```
parkboard/
└── app/
    ├── marketplace/
    │   ├── page.tsx                    ← 03_marketplace_browse.tsx
    │   └── [slotId]/
    │       └── page.tsx                ← 04_marketplace_book.tsx
    └── owner/
        ├── page.tsx                    ← 05_owner_dashboard.tsx
        └── setup/
            └── page.tsx                ← 06_owner_list_slot.tsx
```

---

## 🎯 **File 03: Marketplace Browse**

### **Path:** `app/marketplace/page.tsx`

### **Features:**
- Lists all available slots (`is_available = true`)
- Shows slot number, type (covered/uncovered), price, description
- Click any slot → navigate to booking page
- Empty state if no slots exist
- Link to owner setup page

### **Database Queries:**
```sql
SELECT * FROM parking_slots 
WHERE is_available = true 
ORDER BY created_at DESC
```

### **Design Decisions:**
✅ **Mobile-first:** Cards stack vertically  
✅ **No filters:** Keep it simple for MVP  
✅ **No pagination:** Show all available slots  
✅ **Contact preview:** Truncated to 30 chars

---

## 🎯 **File 04: Marketplace Book**

### **Path:** `app/marketplace/[slotId]/page.tsx`

### **Features:**
- Shows full slot details
- Date + time picker for start/end
- Live price calculation preview
- Submits booking request (status = 'pending')
- Success screen with auto-redirect
- Auth check (redirects to login if needed)

### **Database Queries:**
```sql
-- Load slot
SELECT * FROM parking_slots 
WHERE slot_id = ? AND is_available = true

-- Create booking
INSERT INTO bookings (
  renter_id, slot_id, start_time, end_time, 
  total_price, status
) VALUES (?, ?, ?, ?, ?, 'pending')
```

### **Design Decisions:**
✅ **No payment integration:** MVP uses manual payment  
✅ **No availability checking:** Owner handles conflicts  
✅ **Instant calculation:** Updates as user types  
✅ **Pending status:** Owner confirms manually

---

## 🎯 **File 05: Owner Dashboard**

### **Path:** `app/owner/page.tsx`

### **Features:**
- Lists owner's parking slots
- Shows booking requests for those slots
- Toggle slot availability (mark available/unavailable)
- Displays full renter contact info
- Link to add new slots
- Empty state if no slots exist

### **Database Queries:**
```sql
-- Load owner's slots
SELECT * FROM parking_slots 
WHERE owner_id = ? 
ORDER BY created_at DESC

-- Load bookings with renter info
SELECT 
  b.*,
  ps.slot_number,
  up.name, up.email, up.phone
FROM bookings b
JOIN parking_slots ps ON b.slot_id = ps.slot_id
JOIN user_profiles up ON b.renter_id = up.id
WHERE b.slot_id IN (?)
ORDER BY b.created_at DESC

-- Toggle availability
UPDATE parking_slots 
SET is_available = ? 
WHERE slot_id = ?
```

### **Design Decisions:**
✅ **No edit slot:** Just toggle availability  
✅ **No delete slot:** Keep data integrity for MVP  
✅ **No status updates:** Owner handles externally  
✅ **Full contact info:** Owner needs to call/message renter

---

## 🎯 **File 06: Owner List Slot**

### **Path:** `app/owner/setup/page.tsx`

### **Features:**
- Form to create new parking slot
- Fields: slot number, type, description, price, contact info
- Visual slot type selector (covered/uncovered)
- Price validation (must be > 0)
- Helpful tips and what-happens-next section
- Auto-redirect to dashboard on success

### **Database Queries:**
```sql
INSERT INTO parking_slots (
  owner_id, slot_number, slot_type, description,
  price_per_hour, contact_info, is_available
) VALUES (?, ?, ?, ?, ?, ?, true)
```

### **Design Decisions:**
✅ **No image upload:** Keep it simple  
✅ **No location selection:** Assume same building  
✅ **No availability windows:** Just on/off toggle  
✅ **Optional fields:** Only slot number + price required

---

## 🔒 **Security & RLS Assumptions**

These files assume RLS policies exist in the database:

```sql
-- Users can view available slots
CREATE POLICY "Anyone can view available slots"
ON parking_slots FOR SELECT
USING (is_available = true);

-- Owners can view/edit their own slots
CREATE POLICY "Owners manage their slots"
ON parking_slots FOR ALL
USING (owner_id = auth.uid());

-- Renters can create bookings
CREATE POLICY "Renters can create bookings"
ON bookings FOR INSERT
WITH CHECK (renter_id = auth.uid());

-- Owners can view bookings for their slots
CREATE POLICY "Owners view their bookings"
ON bookings FOR SELECT
USING (slot_id IN (
  SELECT slot_id FROM parking_slots 
  WHERE owner_id = auth.uid()
));
```

**Note:** The `01_minimal_schema.sql` includes these policies. If not applied, queries will fail.

---

## ⚠️ **Known Limitations (By Design)**

| Limitation | Rationale | Future Fix |
|------------|-----------|------------|
| No payment processing | MVP uses manual payment (Viber/GCash) | Add payment gateway later |
| No availability calendar | Owner manages conflicts manually | Add calendar view in v2 |
| No booking approval flow | Status stays "pending" | Add approve/reject in v2 |
| No slot editing | Just toggle on/off | Add edit form in v2 |
| No photo uploads | Keep it simple | Add image upload in v2 |
| No search/filters | Show all slots | Add filters when > 20 slots |
| No notifications | Manual contact via phone/Viber | Add push notifications later |

---

## ✅ **Pre-Deployment Checklist**

### **Code Placement:**
- [ ] Copy `03_marketplace_browse.tsx` → `app/marketplace/page.tsx`
- [ ] Copy `04_marketplace_book.tsx` → `app/marketplace/[slotId]/page.tsx`
- [ ] Copy `05_owner_dashboard.tsx` → `app/owner/page.tsx`
- [ ] Copy `06_owner_list_slot.tsx` → `app/owner/setup/page.tsx`

### **Database:**
- [ ] Run `01_minimal_schema.sql` in Supabase SQL Editor
- [ ] Verify 3 tables exist
- [ ] Verify 5 RLS policies exist
- [ ] Test auth.users can sign up

### **Dependencies:**
```json
{
  "@supabase/auth-helpers-nextjs": "latest",
  "@supabase/supabase-js": "latest",
  "next": "14.x",
  "react": "18.x"
}
```

### **Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🧪 **Testing Flows**

### **Flow 1: Owner Lists Slot**
1. Sign up as owner@test.com/password123 (ARP: redirects to `/dashboard`, manually typed `/owner/setup` as URL)
2. Navigate to `/owner/setup`
3. Fill form: Slot A-101, Covered, ₱50/hr
4. Submit → redirects to `/owner`
5. See slot in "My Slots" section
6. Navigate to `/marketplace`
7. Verify slot appears

### **Flow 2: Renter Books Slot**
1. Sign up as renter@test.com/password123
2. Navigate to `/marketplace`
3. Click on Slot A-101
4. Fill booking form: Tomorrow 9 AM - 5 PM
5. See price preview: ₱400 (8 hours × ₱50)
6. Submit → see success screen
7. Auto-redirect to `/bookings` (if exists)

### **Flow 3: Owner Sees Booking**
1. Log in as owner@test.com
2. Navigate to `/owner`
3. See booking request in "Booking Requests" section
4. View renter details: name, email, phone
5. Contact renter externally to confirm

### **Flow 4: Toggle Slot Availability**
1. Log in as owner@test.com
2. Navigate to `/owner`
3. Click "Mark Unavailable" on Slot A-101
4. Verify status changes to "✕ Not Available"
5. Navigate to `/marketplace` (logged out)
6. Verify slot no longer appears

---

## 🚀 **Launch Readiness**

| Category | Status | Notes |
|----------|--------|-------|
| **Core Flows** | ✅ Complete | Browse → Book → Manage |
| **Database Schema** | ✅ Minimal | 3 tables, 5 policies |
| **UI Complexity** | ✅ Brutally Simple | No abstractions, inline everything |
| **Dependencies** | ✅ Minimal | Only Supabase + Next.js |
| **Mobile Responsive** | ✅ Yes | Mobile-first design |
| **Auth Flow** | ✅ Handled | Supabase Auth |
| **Error Handling** | ✅ Basic | Shows error messages |
| **Loading States** | ✅ Basic | Shows "Loading..." |

---

## 📊 **Code Metrics**

| File | Lines | Complexity | Dependencies |
|------|-------|------------|--------------|
| 03_marketplace_browse.tsx | ~130 | Low | Supabase, Next Link |
| 04_marketplace_book.tsx | ~260 | Medium | Supabase, Next Router/Link |
| 05_owner_dashboard.tsx | ~280 | Medium | Supabase, Next Link |
| 06_owner_list_slot.tsx | ~310 | Low | Supabase, Next Router/Link |
| **Total** | **~980** | **Low-Medium** | **Minimal** |

---

## 🎯 **Success Criteria**

### **Minimum Viable Success:**
- [ ] Owner can list a slot
- [ ] Renter can view the slot
- [ ] Renter can submit booking request
- [ ] Owner can see booking with renter contact info
- [ ] Both parties can contact each other externally

### **Nice to Have (NOT required for launch):**
- Payment processing
- Booking approval workflow
- Email notifications
- Advanced search/filters
- Photo uploads
- Availability calendar

---

## 💡 **Design Philosophy**

These files follow the **"Brutally Simple MVP"** philosophy:

1. **Zero Abstraction:** No utility functions, no helpers, inline everything
2. **Direct Database Calls:** No API layer, talk to Supabase directly
3. **Manual Workflows:** Owner handles conflicts, payments external
4. **Mobile-First:** Works on phones first, desktop is bonus
5. **No Premature Optimization:** Ship working code, optimize later

**Result:** 980 lines of code that does EXACTLY what's needed, nothing more.

---

## 🔥 **Date Prefix Note**

The original manifest used `20250103` (January 3, 2025) but current date is October 3, 2025.

**Decision:** Keep filename prefixes as-is. They're just tracking timestamps and don't affect functionality. Fixing them wastes time that could be spent getting first users.

---

## ✅ **Final Status**

**All 4 files are:**
- ✅ Consistent with minimal schema
- ✅ Aligned with MVP launch checklist
- ✅ Brutally simple (no complexity)
- ✅ Mobile-responsive
- ✅ Production-ready

**Next Step:** Copy these files to your Next.js project and test locally.

**Estimated Time to Launch:** 2-4 hours from now if you start immediately.
```

## Public Assets

## Test Files (Reference)

### Available Test Files:
```
./__tests__/login.test.tsx
./tests/e2e.spec.ts
```

## Potential Issues Detected

### TODO Comments Found:
```
app/login/page.tsx:                    placeholder="Phone Number (+63XXXXXXXXXX)"
```

### Files with potential import issues:
```
No import issues detected in committed files
```


---

## Export Summary

**Generated:** Saturday, 04 October, 2025 05:22:05 PM PST
**Total Files Included:** 12
**Errors Encountered:** 0
**Output Size:** 132K

### What's Included:
✅ Complete project structure
✅ All database schemas and migrations
✅ All TypeScript/React source files
✅ All component definitions
✅ Configuration files
✅ Documentation
✅ Dependencies list
✅ Environment templates (redacted)
✅ Public assets inventory
✅ Potential issues detected

### What's Excluded:
❌ node_modules/
❌ .next/ (build output)
❌ .git/ (version control)
❌ coverage/ (test coverage)
❌ dist/build outputs
❌ Actual environment values
❌ Binary files (images, etc.)

### Usage Instructions:
1. Upload this file to Claude Projects for comprehensive context
2. Use for debugging, refactoring, or feature development
3. Reference specific files when asking for modifications

**File Validation Checklist:**
- [ ] All critical source files present
- [ ] Database schema included
- [ ] Type definitions available
- [ ] Configuration files complete
- [ ] Documentation accessible

