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
