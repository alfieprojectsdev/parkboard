## Your Project Code (JS/JSX/TS/TSX)

```typescript
// ./app/api/bookings/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("bookings").select("*").eq("booking_id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.status && !BOOKING_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${BOOKING_STATUSES.join(", ")}` }, { status: 400 });

    if (body.start_time && body.end_time && new Date(body.end_time) <= new Date(body.start_time))
      return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });

    const { data, error } = await supabase.from("bookings").update(body).eq("booking_id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("bookings").delete().eq("booking_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/bookings/route.ts

// app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key instead
);

const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"];

export async function GET(req: NextRequest) {
  try {
    // Get user_id from query params or headers
    const userId = req.nextUrl.searchParams.get('user_id') || req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, parking_slots(slot_number, slot_type)")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .order("start_time", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();        // only once
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  if (!body.user_id || !body.slot_id || !body.start_time || !body.end_time) {
    return NextResponse.json(
      { error: "Missing required fields: user_id, slot_id, start_time, end_time" },
      { status: 400 }
    );
  }

  // Status validation
  if (body.status && !BOOKING_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of ${BOOKING_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (new Date(body.end_time) <= new Date(body.start_time)) {
    return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
  }

  // Overlap check
  const { data: existing, error: checkErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("slot_id", body.slot_id)
    .eq("status", "confirmed")
    .or(`and(start_time.lt.${body.end_time},end_time.gt.${body.start_time})`);

  if (checkErr)
    return NextResponse.json({ error: "Error checking existing bookings: " + checkErr.message }, { status: 500 });

  if (existing?.length)
    return NextResponse.json({ error: "Slot is already booked for this time period" }, { status: 409 });

  // Insert
  const { data, error } = await supabase
    .from("bookings")
    .insert([{ ...body, status: body.status || "confirmed" }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

```

```typescript
// ./app/api/payments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const PAYMENT_METHODS = ["cash", "gcash", "bank_transfer", "free"];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("payments").select("*").eq("payment_id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.payment_method && !PAYMENT_METHODS.includes(body.payment_method))
      return NextResponse.json({ error: `Invalid payment_method. Must be one of ${PAYMENT_METHODS.join(", ")}` }, { status: 400 });

    if (body.status && !PAYMENT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${PAYMENT_STATUSES.join(", ")}` }, { status: 400 });

    if (body.amount && body.amount < 0)
      return NextResponse.json({ error: "amount must be >= 0" }, { status: 400 });

    const { data, error } = await supabase.from("payments").update(body).eq("payment_id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("payments").delete().eq("payment_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/payments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const PAYMENT_METHODS = ["cash", "gcash", "bank_transfer", "free"];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

export async function GET() {
  const { data, error } = await supabase.from("payments").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!PAYMENT_METHODS.includes(body.payment_method))
      return NextResponse.json({ error: `Invalid payment_method. Must be one of ${PAYMENT_METHODS.join(", ")}` }, { status: 400 });

    if (!PAYMENT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${PAYMENT_STATUSES.join(", ")}` }, { status: 400 });

    if (body.amount < 0) return NextResponse.json({ error: "amount must be >= 0" }, { status: 400 });

    if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
      const { data: booking } = await supabase.from("bookings").select("booking_id").eq("booking_id", body.booking_id).single();
      if (!booking) return NextResponse.json({ error: "booking_id does not exist" }, { status: 400 });
    }

    const { data, error } = await supabase.from("payments").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

```typescript
// ./app/api/profiles/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const ROLES = ["resident", "admin"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.role && !ROLES.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of ${ROLES.join(", ")}` }, { status: 400 });
    }

    const { data, error } = await supabase.from("user_profiles").update(body).eq("id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("user_profiles").delete().eq("id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/profiles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const ROLES = ["resident", "admin"];

export async function GET() {
  const { data, error } = await supabase.from("user_profiles").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Enum validation
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of ${ROLES.join(", ")}` }, { status: 400 });
    }

    // Prod FK check
    if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
      const { data: user, error: fkError } = await supabase
        .from("auth.users")
        .select("id")
        .eq("id", body.id)
        .single();

      if (!user) return NextResponse.json({ error: "id does not exist in auth.users" }, { status: 400 });
      if (fkError) return NextResponse.json({ error: fkError.message }, { status: 500 });
    }

    const { data, error } = await supabase.from("user_profiles").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

```typescript
// ./app/api/slots/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const SLOT_TYPES = ["covered", "uncovered", "visitor"];
const SLOT_STATUSES = ["available", "maintenance", "reserved"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("parking_slots").select("*").eq("slot_id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.slot_type && !SLOT_TYPES.includes(body.slot_type))
      return NextResponse.json({ error: `Invalid slot_type. Must be one of ${SLOT_TYPES.join(", ")}` }, { status: 400 });

    if (body.status && !SLOT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${SLOT_STATUSES.join(", ")}` }, { status: 400 });

    const { data, error } = await supabase.from("parking_slots").update(body).eq("slot_id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("parking_slots").delete().eq("slot_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/slots/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const SLOT_TYPES = ["covered", "uncovered", "visitor"];
const SLOT_STATUSES = ["available", "maintenance", "reserved"];

export async function GET() {
  const { data, error } = await supabase.from("parking_slots").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
const body = await req.json();

    if (body.slot_type && !SLOT_TYPES.includes(body.slot_type))
      return NextResponse.json({ error: `Invalid slot_type. Must be one of ${SLOT_TYPES.join(", ")}` }, { status: 400 });

    if (body.status && !SLOT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${SLOT_STATUSES.join(", ")}` }, { status: 400 });

    const { data, error } = await supabase.from("parking_slots").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

```typescript
// ./app/api/test/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok", route: "test" });
}

```

```typescript
// ./app/bookings/page.tsx

// app/bookings/page.tsx
import { supabase } from "@/lib/supabase";
import AuthWrapper from "@/components/AuthWrapper";
import UserBookingsList from "@/components/UserBookingsList";

export default async function BookingsPage() {
  // Get the currently logged-in user
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return (
      <div className="p-8 text-red-600 font-bold">
        ❌ Error fetching session
        <pre>{JSON.stringify(sessionError, null, 2)}</pre>
      </div>
    );
  }

  if (!session?.user) {
    return <AuthWrapper />; // redirect or show login if not signed in
  }

  const userId = session.user.id;

  // Fetch the user's bookings
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-red-600 font-bold">
        ❌ Supabase Error
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  // Handler for cancelling a booking
  // TODO: refactor handleBooking and handleCancel later to use React state instead of window.location.reload() for smoother UX
  const handleCancel = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      alert("Error cancelling booking: " + error.message);
      return;
    }

    // Ideally, refetch bookings here; for now, simple page reload
    // handleCancel updates the booking’s status to "cancelled"; 
    // TODO: replace the window.location.reload() with a reactive state update 
    window.location.reload();
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      <UserBookingsList bookings={bookings} onCancel={handleCancel} />
    </main>
  );
}

```

```typescript
// ./app/dashboard/page.tsx

// app/dashboard/page.js – Entry point for resident dashboard

import AuthWrapper from "@/components/AuthWrapper";
// import DevAuthWrapper from "@/components/DevAuthWrapper";
import Navigation from "@/components/Navigation";
import UserDashboard from "@/components/UserDashboard";

export const metadata = {
  title: "Dashboard | ParkBoard",
  description: "View and manage your parking bookings",
};

export default function DashboardPage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1">
          <UserDashboard />
        </main>
      </div>
    </AuthWrapper>
  );
}

```

```typescript
// ./app/layout.tsx

export const metadata = {
  title: 'Next.js',
  description: 'Generated by Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

```

```typescript
// ./app/login/page.tsx

// app/login/page.tmp.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      router.replace("/dashboard");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Basic password confirmation check
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      setLoading(false);
      return;
    }

    // First, sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // Then create the user profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            name: name,
            unit_number: unitNumber,
            phone: phone || null,
            vehicle_plate: vehiclePlate || null,
          }
        ]);
        
      if (profileError) {
        console.error('Profile creation error:', profileError);
        setErrorMsg("Account created but profile setup failed. Please contact support.");
      } else {
        setSuccessMsg("Account created successfully! You can now sign in.");
        // Switch to login mode after successful signup
        setIsSignup(false);
        setPassword("");
        setConfirmPassword("");
        setName("");
        setUnitNumber("");
        setPhone("");
        setVehiclePlate("");
      }
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setErrorMsg("");
    setSuccessMsg("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setUnitNumber("");
    setPhone("");
    setVehiclePlate("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            {isSignup ? "Sign Up" : "Login"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {isSignup && (
              <>
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
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
                <Input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Vehicle Plate (optional)"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                />
              </>
            )}
            
            {errorMsg && (
              <p className="text-sm text-red-500">{errorMsg}</p>
            )}
            
            {successMsg && (
              <p className="text-sm text-green-600">{successMsg}</p>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? (isSignup ? "Creating account..." : "Signing in...") 
                : (isSignup ? "Sign Up" : "Sign In")
              }
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {isSignup 
                ? "Already have an account? Sign in" 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

```typescript
// ./app/page.tsx

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">🚗 ParkBoard MVP</h1>
      <p className="mt-4">If you see this, Next.js is running locally!</p>
    </main>
  );
}

```

```typescript
// ./app/slots/page.tsx

// app/slots/page.tsx
import { supabase } from "@/lib/supabase";
import AuthWrapper from "@/components/AuthWrapper";
import SlotGrid from "@/components/SlotGrid";
import BookingForm from "@/components/BookingForm";

export default async function SlotsPage() {
  // Get logged-in user session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return (
      <div className="p-8 text-red-600 font-bold">
        ❌ Error fetching session
        <pre>{JSON.stringify(sessionError, null, 2)}</pre>
      </div>
    );
  }

  if (!session?.user) {
    return <AuthWrapper />;
  }

  const userId = session.user.id;

  // Fetch available slots
  const { data: slots, error } = await supabase
    .from("parking_slots")
    .select("*")
    .eq("status", "available")
    .order("slot_number", { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-red-600 font-bold">
        ❌ Supabase Error
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  // Handler when booking is submitted
  // TODO: refactor handleBooking and handleCancel later to use React state instead of window.location.reload() for smoother UX.
  const handleBooking = async (slotId: string, startTime: string, endTime: string) => {
    const { error } = await supabase.from("bookings").insert([
      {
        slot_id: slotId,
        user_id: userId,
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
      },
    ]);

    if (error) {
      alert("Error creating booking: " + error.message);
      return;
    }

    alert("Booking successful!");
    window.location.href = "/bookings"; // redirect to bookings page
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Available Slots</h1>

      <SlotGrid slots={slots} />

      <div className="mt-8">
        <BookingForm slots={slots} onSubmit={handleBooking} />
      </div>
    </main>
  );
}

```

```typescript
// ./app/test/page.tsx

import { supabase } from "@/lib/supabase";

export default async function TestPage() {
  const { data: slots, error } = await supabase
    .from("parking_slots")
    .select("*")
    .limit(5);

  if (error) {
    return (
      <div className="p-8 text-red-600">
        <h1>❌ Supabase Error</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">✅ Supabase Test</h1>
      <ul className="mt-4 space-y-2">
  {slots?.length ? (
    slots.map((slot, index) => (
      <li
        key={slot.id ?? `slot-${index}`} // fallback to index if id is missing
        className="border p-2 rounded"
      >
        {slot.slot_number || "Unnamed Slot"} — {slot.description || "No description"}
      </li>
    ))
  ) : (
    <li>No slots found.</li>
  )}
</ul>
    </main>
  );
}

```

```typescript
// ./components/AdminDashboard.tsx

// =============================================================================
// AdminDashboard.js - Admin overview and management
// =============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import SlotGrid from './SlotGrid';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    // Bookings
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*, user_profiles(name, unit_number, email), parking_slots(slot_number, slot_type)')
      .order('start_time', { ascending: true });
    // Slots
    const { data: slotsData } = await supabase
      .from('parking_slots')
      .select('*')
      .order('slot_number');
    // Users
    const { data: usersData } = await supabase
      .from('user_profiles')
      .select('*')
      .order('name');
    setBookings(bookingsData || []);
    setSlots(slotsData || []);
    setUsers(usersData || []);
    setLoading(false);
  };

  const updateSlotStatus = async (slotId, newStatus) => {
    await supabase
      .from('parking_slots')
      .update({ status: newStatus })
      .eq('slot_id', slotId);
    fetchDashboardData();
  };

  const changeUserRole = async (userId, newRole) => {
    await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);
    fetchDashboardData();
  };

  if (loading) return <div>Loading admin dashboard...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex space-x-4 mb-6">
        {['bookings', 'slots', 'users'].map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div key={booking.booking_id} className="border rounded p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{booking.parking_slots?.slot_number}</div>
                <div className="text-sm">{booking.user_profiles?.name} ({booking.user_profiles?.unit_number})</div>
                <div className="text-xs">{new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleString()}</div>
                <div className="text-xs">Status: {booking.status}</div>
              </div>
              {/* Admin can cancel booking */}
              {booking.status === 'confirmed' && (
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={async () => {
                    await supabase
                      .from('bookings')
                      .update({ status: 'cancelled' })
                      .eq('booking_id', booking.booking_id);
                    fetchDashboardData();
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'slots' && (
        <div className="space-y-4">
          {slots.map(slot => (
            <div key={slot.slot_id} className="border rounded p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{slot.slot_number}</div>
                <div className="text-xs">{slot.slot_type}</div>
                <div className="text-xs">{slot.description}</div>
                <div className="text-xs">Status: {slot.status}</div>
              </div>
              <select
                value={slot.status}
                onChange={e => updateSlotStatus(slot.slot_id, e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="border rounded p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{user.name}</div>
                <div className="text-xs">{user.unit_number}</div>
                <div className="text-xs">{user.email}</div>
                <div className="text-xs">Role: {user.role}</div>
                <div className="text-xs">{user.vehicle_plate}</div>
              </div>
              <select
                value={user.role}
                onChange={e => changeUserRole(user.id, e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="resident">Resident</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

```typescript
// ./components/AuthWrapper.tsx

// components/AuthWrapper.tsx - Authentication gate and session management
"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user || null);
      setLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setProfileLoading(true);
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Profile fetch error:", error);
          // If profile doesn't exist, you might want to redirect to a profile setup page
          // For now, we'll just set profile to null and let the user continue
          setProfile(null);
        } else {
          setProfile(data);
        }
        setProfileLoading(false);
      } else {
        setProfile(null);
        // Only redirect to login if we're not loading and there's no user
        if (!loading) {
          router.replace("/login");
        }
      }
    };
    fetchProfile();
  }, [user, router, loading]);

  const value = { user, profile, loading: loading || profileLoading };

  // Don't redirect if we're still loading the initial auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // If no user after loading is complete, don't render children
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {profileLoading ? (
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
```

```typescript
// ./components/BookingCard.tsx

// =============================================================================
// BookingCard.js - Individual booking display component
// =============================================================================

function BookingCard({ booking, onCancel }) {
  const now = new Date();
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const isActive = booking.status === 'confirmed' && endTime > now;
  const isPast = endTime <= now;

  const getStatusColor = () => {
    switch (booking.status) {
      case 'confirmed': return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">
            Slot {booking.parking_slots?.slot_number}
          </h3>
          <p className="text-sm text-gray-500 capitalize">
            {booking.parking_slots?.slot_type}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor()}`}>
          {booking.status}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        <div className="font-medium">
          {startTime.toLocaleDateString()}
        </div>
        <div>
          {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}
        </div>
      </div>

      {booking.parking_slots?.description && (
        <p className="text-sm text-gray-500">
          {booking.parking_slots.description}
        </p>
      )}

      {booking.notes && (
        <div className="text-sm">
          <span className="font-medium text-gray-700">Notes: </span>
          <span className="text-gray-600">{booking.notes}</span>
        </div>
      )}

      {isActive && booking.status === 'confirmed' && (
        <button
          onClick={() => onCancel(booking.booking_id)}
          className="w-full mt-3 px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
        >
          Cancel Booking
        </button>
      )}
    </div>
  );
}


```

```typescript
// ./components/BookingConfirmation.tsx

// =============================================================================
// components/BookingConfirmation.js - Success state after booking
// =============================================================================

export default function BookingConfirmation({ booking, onDone }) {
  return (
    <div className="bg-green-100 p-6 rounded-lg text-center">
      <h2 className="text-xl font-bold mb-2">Booking Confirmed!</h2>
      <div className="mb-2">
        <strong>Slot:</strong> {booking.slot_id}
      </div>
      <div className="mb-2">
        <strong>Start:</strong> {new Date(booking.start_time).toLocaleString()}
      </div>
      <div className="mb-2">
        <strong>End:</strong> {new Date(booking.end_time).toLocaleString()}
      </div>
      <button
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}
```

```typescript
// ./components/BookingForm.tsx

// components/BookingForm.tsx - Handle slot booking creation (MVP-ready)
"use client";

import { useState } from 'react';
import TimeRangePicker from './TimeRangePicker';
import SlotGrid from './SlotGrid';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthWrapper';

export default function BookingForm({ onSuccess }) {
  const { profile, user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState({ start: '', end: '' });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBooking = async () => {
    if (!selectedSlot || !selectedTimeRange.start || !selectedTimeRange.end) {
      setError('Please select a slot and time range.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    console.log({ profile, selectedSlot, selectedTimeRange });

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: profile.id,            // <-- from AuthWrapper
          slot_id: selectedSlot.slot_id,  // <-- must match DB type
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          status: 'confirmed',
          notes: '',
        })
,
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Booking failed');

      setSuccess('Booking successful!');
      onSuccess({ ...result, slot_number: selectedSlot.slot_number, slot_type: selectedSlot.slot_type });
      // onSuccess(Array.isArray(result) ? result[0] : result);
      
      // Reset form
      setSelectedSlot(null);
      setSelectedTimeRange({ start: '', end: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Book a Parking Slot</h2>
        <TimeRangePicker value={selectedTimeRange} onChange={setSelectedTimeRange} />
      </div>

      {selectedTimeRange.start && selectedTimeRange.end && (
        <SlotGrid
          selectedDate={selectedTimeRange.start?.slice(0, 10)}
          selectedTimeRange={selectedTimeRange}
          onSlotSelect={setSelectedSlot}
        />
      )}

      {selectedSlot && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800">Selected Slot</h3>
          <p className="text-blue-700">
            {selectedSlot.slot_number} ({selectedSlot.slot_type})
          </p>
          <p className="text-sm text-blue-600 mt-2">
            {new Date(selectedTimeRange.start).toLocaleString()} - {' '}
            {new Date(selectedTimeRange.end).toLocaleString()}
          </p>
          
          <button
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleBooking}
            disabled={loading}
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          <strong>Success:</strong> {success}
        </div>
      )}
    </div>
  );
}
```

```typescript
// ./components/DevAuthWrapper.tsx

// =============================================================================
// DevAuthWrapper.js - bypass auth for local dev/testing
// =============================================================================
"use client";

import { createContext, useContext } from "react";

const AuthContext = createContext({
  user: { id: "11111111-1111-1111-1111-111111111111" },
  profile: {
    id: "11111111-1111-1111-1111-111111111111",
    role: "resident",
    name: "Alice Resident"
  },
  loading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function DevAuthWrapper({ children }) {
  return <AuthContext.Provider value={useAuth()}>{children}</AuthContext.Provider>;
}

```

```typescript
// ./components/Navigation.tsx

// =============================================================================
// components/Navigation.js - Header with user info and role switching
// =============================================================================
"use client";

import Link from 'next/link';
import { useAuth } from './AuthWrapper';
import { useState } from 'react';
import { supabase } from "@/lib/supabase";

export default function Navigation() {
  const { profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-100">
      <div className="flex justify-between w-full md:w-auto">
        <div className="font-bold text-lg">ParkBoard</div>
        <button
          className="md:hidden text-gray-600"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>
      <div className={`flex-col md:flex-row md:flex space-y-2 md:space-y-0 md:space-x-4 ${menuOpen ? 'flex' : 'hidden md:flex'}`}>
        <Link href="/dashboard" className="text-blue-600">Dashboard</Link>
        {profile?.role === 'admin' && (
          <Link href="/admin" className="text-purple-600">Admin</Link>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-red-600"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}


```

```typescript
// ./components/SlotGrid.tsx

// SlotGrid.tsx - Display available slots with booking capability
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SlotGrid({ 
  selectedDate, 
  selectedTimeRange,
  onSlotSelect,
  refreshTrigger = 0 
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableSlots();
  }, [selectedDate, selectedTimeRange, refreshTrigger]);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch all active slots
      const { data: allSlots, error: slotsError } = await supabase
        .from('parking_slots')
        .select('slot_id, slot_number, slot_type, status, description')
        .in('status', ['available', 'reserved']);

      if (slotsError) throw slotsError;

      // If time range is selected, check for conflicts
      if (selectedTimeRange?.start && selectedTimeRange?.end) {
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('slot_id')
          .eq('status', 'confirmed')
          .lt('start_time', selectedTimeRange.end)
          .gt('end_time', selectedTimeRange.start);

        if (bookingsError) throw bookingsError;

        const bookedSlotIds = new Set(bookings.map(b => b.slot_id));
        
        // Mark slots as available/booked
        const slotsWithAvailability = allSlots.map(slot => ({
          ...slot,
          isAvailable: slot.status === 'available' && !bookedSlotIds.has(slot.slot_id)
        }));

        setSlots(slotsWithAvailability);
      } else {
        // No time range selected, show all slots
        setSlots(allSlots.map(slot => ({
          ...slot,
          isAvailable: slot.status === 'available'
        })));
      }
    } catch (err: any) {
      setError('Failed to load parking slots');
      console.error(
    'Error fetching slots:',
    err?.error ?? err?.message ?? err);
    } finally {
      setLoading(false);
    }
  };

  const getSlotStatusColor = (slot) => {
    if (slot.status === 'maintenance') return 'bg-red-200 text-red-800';
    if (slot.status === 'reserved') return 'bg-yellow-200 text-yellow-800';
    if (!slot.isAvailable) return 'bg-gray-200 text-gray-600';
    return 'bg-green-200 text-green-800 hover:bg-green-300 cursor-pointer';
  };

  if (loading) {
    return <div className="text-center py-8">Loading parking slots...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-200 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-200 rounded"></div>
          <span>Maintenance</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-200 rounded"></div>
          <span>Reserved</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {slots.map((slot) => (
          <div key={slot.slot_id ?? slot.id}
            onClick={() =>
              slot.isAvailable &&
              slot.status === 'available' &&
              onSlotSelect({
                slot_id: slot.slot_id,       // real PK column
                slot_number: slot.slot_number,
                slot_type: slot.slot_type,
              })
              }
            className={`p-4 rounded-lg border text-center ${getSlotStatusColor(slot)} transition-all duration-150`}
          >
            <div className="font-bold text-base md:text-lg">{slot.slot_number}</div>
            <div className="text-xs capitalize mt-1">{slot.slot_type}</div>
            {slot.description && (
              <div className="text-xs text-gray-600 mt-1">{slot.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


```

```typescript
// ./components/TimeRangePicker.tsx

// components/TimeRangePicker.tsx - Select start/end times for booking
"use client";

import { useEffect, useState } from 'react';

export default function TimeRangePicker({ value, onChange }) {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('4'); // hours
  const [error, setError] = useState('');

  // Helper: calculate ISO start/end times and call onChange
  const updateTimeRange = (date, time, dur) => {
    if (!date || !time) return;

    try {
      const start = new Date(`${date}T${time}`);
      const end = new Date(start.getTime() + parseFloat(dur) * 60 * 60 * 1000);

      const now = new Date();
      if (start <= now) throw new Error('Start time must be in the future');
      if (end <= start) throw new Error('End time must be after start time');

      setError('');
      onChange({
        start: start.toISOString(),
        end: end.toISOString(),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Update parent whenever any input changes
  useEffect(() => {
    updateTimeRange(startDate, startTime, duration);
  }, [startDate, startTime, duration]);

  // Default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
  }, []);

  return (
    <div className="max-w-md space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Start Time</label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Duration</label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="1">1 hour</option>
          <option value="2">2 hours</option>
          <option value="4">4 hours</option>
          <option value="8">8 hours</option>
          <option value="12">12 hours</option>
          <option value="24">24 hours</option>
        </select>
      </div>
    </div>
  );
}

```

```typescript
// ./components/ui/alert.tsx

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
// ./components/ui/badge.tsx

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
// ./components/ui/button.tsx

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
// ./components/ui/card.tsx

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
// ./components/ui/input.tsx

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
// ./components/ui/tabs.tsx

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

```typescript
// ./components/UserBookingsList.tsx

// components/UserBookingsList.tsx - Display and manage user's bookings
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function UserBookingsList({ userId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*, parking_slots(slot_number, slot_type)')
        .eq('user_id', userId)
        .in('status', ['confirmed'])
        .order('start_time', { ascending: true });
      setBookings(data || []);
      setLoading(false);
    }
    if (userId) fetchBookings();
  }, [userId]);

  const cancelBooking = async (bookingId) => {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('booking_id', bookingId);
    setBookings(bookings.filter(b => b.booking_id !== bookingId));
  };

  if (loading) return <div>Loading bookings...</div>;
  if (!bookings.length) return <div>No active bookings.</div>;

  return (
    <div className="space-y-4">
      {bookings.map(booking => (
        <div key={booking.booking_id} className="border rounded p-4 flex justify-between items-center">
          <div>
            <div className="font-bold">{booking.parking_slots?.slot_number}</div>
            <div className="text-sm">{new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleString()}</div>
          </div>
          <button
            className="bg-red-600 text-white px-3 py-1 rounded"
            onClick={() => cancelBooking(booking.booking_id)}
          >
            Cancel
          </button>
        </div>
      ))}
    </div>
  );
}


```

```typescript
// ./components/UserDashboard.tsx

// components/UserDashboard.tsx - Main resident view with bookings and new booking flow
"use client";

import { useState } from 'react';
import UserBookingsList from './UserBookingsList';
import BookingForm from './BookingForm';
import BookingConfirmation from './BookingConfirmation';
import { useAuth } from './AuthWrapper';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const { profile, loading } = useAuth();

  // Guard for loading state and missing profile
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 mb-2">No profile found</p>
          <p className="text-sm text-gray-600">Please contact support if this issue persists.</p>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setBookingConfirmed(null); // reset confirmation when switching tabs
  };
 
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Welcome back, {profile.name}!
        </h1>
        <p className="text-gray-600">Unit {profile.unit_number}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'bookings' 
              ? 'border-blue-600 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('bookings')}
        >
          My Bookings
        </button>
        <button
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'new' 
              ? 'border-blue-600 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('new')}
        >
          New Booking
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'bookings' && (
          <UserBookingsList userId={profile.id || ''} />
        )}

        {activeTab === 'new' && !bookingConfirmed && (
          <BookingForm
            onSuccess={setBookingConfirmed}
          />
        )}

        {bookingConfirmed && (
          <BookingConfirmation
            booking={bookingConfirmed}
            onDone={() => setBookingConfirmed(null)}
          />
        )}
      </div>
    </div>
  );
}
```

```typescript
// ./lib/supabaseServer.ts

// lib/supabaseServer.ts
import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    // NEW v0.7+ cookie API
    cookieOptions: {
      get: (name: string) => nextCookies().get(name)?.value ?? null,
      set: (name: string, value: string) => nextCookies().set(name, value),
      remove: (name: string) => nextCookies().delete(name),
    },
  });
}

```

```typescript
// ./lib/supabase.ts

// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

```

```typescript
// ./lib/utils.ts

// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Your Configuration Files

```javascript
// tailwind.config.js

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
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
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

```javascript
// .env.local

NEXT_PUBLIC_SUPABASE_URL=https://cgbkknefvggnhkvmuwsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYmtrbmVmdmdnbmhrdm11d3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMjEyMDksImV4cCI6MjA2Mzc5NzIwOX0.Fd-DYgiMu8hKbUDrMTsw8l_wW2jv1ZPjhkiH4wL2k7k
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnYmtrbmVmdmdnbmhrdm11d3NhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIyMTIwOSwiZXhwIjoyMDYzNzk3MjA5fQ.dTqy3VbbIFeDC0rcxj6kRGdbkTClZlCvawPV4FQKi0A
NEXT_PUBLIC_DEV_MODE=true


```

## Package Dependencies

```json
// package.json (dependencies only)


```

