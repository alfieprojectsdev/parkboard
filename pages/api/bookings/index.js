import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  const userId = req.headers['x-user-id']; // Pass user id from client/session

  if (req.method === 'GET') {
    // Get user's current bookings
    if (!userId) return res.status(401).json({ error: 'Missing user id' });

    const { data, error } = await supabase
      .from('bookings')
      .select('*, parking_slots(slot_number, slot_type)')
      .eq('user_id', userId)
      .in('status', ['confirmed'])
      .order('start_time', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ bookings: data });
  }

  if (req.method === 'POST') {
    // Create new booking
    const { slot_id, start_time, end_time, notes } = req.body;
    if (!userId || !slot_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prevent past bookings
    if (new Date(start_time) < new Date(Date.now() - 60 * 60 * 1000)) {
      return res.status(400).json({ error: 'Cannot book in the past' });
    }

    // Prevent double-booking (conflict check)
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('booking_id')
      .eq('slot_id', slot_id)
      .eq('status', 'confirmed')
      .lt('start_time', end_time)
      .gt('end_time', start_time);

    if (conflicts?.length > 0) {
      return res.status(409).json({ error: 'Time slot conflicts with existing booking' });
    }

    // Enforce one active booking per user
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('booking_id')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gt('end_time', new Date().toISOString());

    if (activeBookings?.length > 0) {
      return res.status(409).json({ error: 'User already has an active booking' });
    }

    // Insert booking
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        slot_id,
        start_time,
        end_time,
        notes,
        status: 'confirmed'
      })
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ booking: data[0] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}