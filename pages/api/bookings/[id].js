import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;
  const userId = req.headers['x-user-id'];

  if (!id) return res.status(400).json({ error: 'Missing booking id' });

  if (req.method === 'PUT') {
    // Cancel or update booking
    const { status, notes, start_time, end_time } = req.body;

    // Only allow status change to 'cancelled' or update times/notes
    if (status && !['cancelled', 'confirmed', 'completed', 'no_show'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // If updating times, check for conflicts
    if (start_time && end_time) {
      if (new Date(start_time) < new Date(Date.now() - 60 * 60 * 1000)) {
        return res.status(400).json({ error: 'Cannot book in the past' });
      }
      const { data: booking } = await supabase
        .from('bookings')
        .select('slot_id')
        .eq('booking_id', id)
        .single();

      const { data: conflicts } = await supabase
        .from('bookings')
        .select('booking_id')
        .eq('slot_id', booking.slot_id)
        .eq('status', 'confirmed')
        .lt('start_time', end_time)
        .gt('end_time', start_time)
        .neq('booking_id', id);

      if (conflicts?.length > 0) {
        return res.status(409).json({ error: 'Time slot conflicts with existing booking' });
      }
    }

    // Update booking
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status,
        notes,
        start_time,
        end_time
      })
      .eq('booking_id', id)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ booking: data[0] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}