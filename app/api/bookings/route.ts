import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"];

export async function GET() {
  const { data, error } = await supabase.from("bookings").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Status validation
    if (body.status && !BOOKING_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${BOOKING_STATUSES.join(", ")}` }, { status: 400 });

    // Time validation
    if (body.end_time && body.start_time && new Date(body.end_time) <= new Date(body.start_time))
      return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });

    if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
      // FK checks
      const { data: user } = await supabase.from("auth.users").select("id").eq("id", body.user_id).single();
      if (!user) return NextResponse.json({ error: "user_id does not exist" }, { status: 400 });

      const { data: slot } = await supabase.from("parking_slots").select("slot_id").eq("slot_id", body.slot_id).single();
      if (!slot) return NextResponse.json({ error: "slot_id does not exist" }, { status: 400 });
    }

    const { data, error } = await supabase.from("bookings").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
