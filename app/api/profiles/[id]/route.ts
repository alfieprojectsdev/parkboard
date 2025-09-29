import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// CRITICAL: Use SERVICE_ROLE_KEY to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ✅ Fixed: was using ANON_KEY
);

const ROLES = ["resident", "admin"];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      console.error('GET profile by ID error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('GET profile by ID exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    console.log('PATCH profile:', params.id);

    // Validate role if provided
    if (body.role && !ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of ${ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.unit_number !== undefined) updates.unit_number = body.unit_number.trim();
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.vehicle_plate !== undefined) updates.vehicle_plate = body.vehicle_plate?.trim() || null;
    if (body.role !== undefined) updates.role = body.role;

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log('Profile updated successfully:', data.id);
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('PATCH profile exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('DELETE profile:', params.id);

    const { error } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error('Delete profile error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Profile deleted successfully');
    return NextResponse.json({ message: "Profile deleted successfully" });

  } catch (err: any) {
    console.error('DELETE profile exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}