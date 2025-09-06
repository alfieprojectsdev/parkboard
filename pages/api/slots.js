import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'Missing start or end time' });
  }

  // Find available slots for the given time range
  const { data: slots, error: slotsError } = await supabase
    .from('parking_slots')
    .select('*')
    .eq('status', 'available');

  if (slotsError) {
    return res.status(500).json({ error: 'Failed to fetch slots' });
  }

  // Find booked slots in the time range
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('slot_id')
    .eq('status', 'confirmed')
    .lt('start_time', end)
    .gt('end_time', start);

  if (bookingsError) {
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }

  const bookedSlotIds = new Set(bookings.map(b => b.slot_id));
  const availableSlots = slots.filter(slot => !bookedSlotIds.has(slot.slot_id));

  return res.status(200).json({ slots: availableSlots });
}