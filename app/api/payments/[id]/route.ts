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
