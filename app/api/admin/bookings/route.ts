// app/api/admin/bookings/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: Request) {
  try {
    console.log('🔍 Admin API: Fetching all bookings...');
    
    // Now that foreign keys exist, this should work
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        user_profiles!bookings_user_id_fkey(name, unit_number, email),
        parking_slots!bookings_slot_id_fkey(slot_number, slot_type)
      `)
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint 
      }, { status: 500 });
    }

    console.log(`✅ Admin API: Successfully fetched ${bookings?.length || 0} bookings`);
    return NextResponse.json({ bookings });
    
  } catch (err: any) {
    console.error('💥 API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}