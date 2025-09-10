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
