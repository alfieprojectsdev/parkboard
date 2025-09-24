// ./app/api/bookings/route.ts

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

    // FIXED: Added nested parking_slots relation to match POST endpoint
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
    // return the booking plus parking_slots relation so frontend gets slot_number & slot_type
    .select("*, parking_slots(slot_number, slot_type)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}