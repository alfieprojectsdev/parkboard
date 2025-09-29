import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, currency = 'USD', message } = body;

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Try to get the current user from the server cookies (if present)
    const { data: { user } } = await supabase.auth.getUser();

    const insert = {
      user_id: user?.id ?? null,
      amount: Number(amount),
      currency,
      message,
      status: 'completed'
    };

    const { data, error } = await supabase.from('donations').insert([insert]).select().single();

    if (error) {
      console.error('donations insert error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ donation: data });
  } catch (e: any) {
    console.error('donations route error', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
