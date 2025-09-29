import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
