import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  const userId = req.headers['x-user-id'];

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin role
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || !user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }

  // Get all bookings with user and slot info
  const { data, error } = await supabase
    .from('bookings')
    .select('*, user_profiles(name, unit_number, email), parking_slots(slot_number, slot_type)')
    .order('start_time', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ bookings: data });
}