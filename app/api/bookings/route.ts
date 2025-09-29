// =====================================================
// File: app/api/bookings/route.ts
// Updated booking API with ownership validation
// =====================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      .select("*, parking_slots(slot_number, slot_type, owner_id)")
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
    body = await req.json();
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

  // Validate booking duration limits
  const start = new Date(body.start_time);
  const end = new Date(body.end_time);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  const MIN_DURATION_HOURS = 1;
  const MAX_DURATION_HOURS = 24;
  const MAX_ADVANCE_DAYS = 30;
  
  if (durationHours < MIN_DURATION_HOURS) {
    return NextResponse.json(
      { error: `Minimum booking duration is ${MIN_DURATION_HOURS} hour(s)` },
      { status: 400 }
    );
  }
  
  if (durationHours > MAX_DURATION_HOURS) {
    return NextResponse.json(
      { error: `Maximum booking duration is ${MAX_DURATION_HOURS} hours` },
      { status: 400 }
    );
  }
  
  const now = new Date();
  const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysInAdvance > MAX_ADVANCE_DAYS) {
    return NextResponse.json(
      { error: `Cannot book more than ${MAX_ADVANCE_DAYS} days in advance` },
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

  // Check slot ownership
  const { data: slot, error: slotError } = await supabase
    .from("parking_slots")
    .select("owner_id, status")
    .eq("slot_id", body.slot_id)
    .single();

  if (slotError || !slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.status !== 'available') {
    return NextResponse.json(
      { error: `Slot is currently ${slot.status}` },
      { status: 400 }
    );
  }

  // Check if slot is owned by someone else
  if (slot.owner_id && slot.owner_id !== body.user_id) {
    return NextResponse.json(
      { error: "This slot is reserved for another resident" },
      { status: 403 }
    );
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
    .select("*, parking_slots(slot_number, slot_type, owner_id)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}