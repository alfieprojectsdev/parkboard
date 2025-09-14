// components/UserBookingsList.tsx - Display and manage user's bookings
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function UserBookingsList({ userId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*, parking_slots(slot_number, slot_type)')
        .eq('user_id', userId)
        .in('status', ['confirmed'])
        .order('start_time', { ascending: true });
      setBookings(data || []);
      setLoading(false);
    }
    if (userId) fetchBookings();
  }, [userId]);

  const cancelBooking = async (bookingId) => {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('booking_id', bookingId);
    setBookings(bookings.filter(b => b.booking_id !== bookingId));
  };

  if (loading) return <div>Loading bookings...</div>;
  if (!bookings.length) return <div>No active bookings.</div>;

  return (
    <div className="space-y-4">
      {bookings.map(booking => (
        <div key={booking.booking_id} className="border rounded p-4 flex justify-between items-center">
          <div>
            <div className="font-bold">{booking.parking_slots?.slot_number}</div>
            <div className="text-sm">{new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleString()}</div>
          </div>
          <button
            className="bg-red-600 text-white px-3 py-1 rounded"
            onClick={() => cancelBooking(booking.booking_id)}
          >
            Cancel
          </button>
        </div>
      ))}
    </div>
  );
}

