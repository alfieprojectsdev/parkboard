// =============================================================================
// UserBookingsList.js - Display and manage user's bookings
// =============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function UserBookingsList({ userId, refreshTrigger = 0 }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'active', 'past', 'all'

  useEffect(() => {
    fetchUserBookings();
  }, [userId, refreshTrigger]);

  const fetchUserBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          parking_slots(slot_number, slot_type, description)
        `)
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('booking_id', bookingId);

      if (error) throw error;
      fetchUserBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking');
    }
  };

  const getFilteredBookings = () => {
    const now = new Date();
    
    switch (filter) {
      case 'active':
        return bookings.filter(b => 
          b.status === 'confirmed' && new Date(b.end_time) > now
        );
      case 'past':
        return bookings.filter(b => 
          b.status === 'completed' || new Date(b.end_time) <= now
        );
      default:
        return bookings;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your bookings...</div>;
  }

  const filteredBookings = getFilteredBookings();

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'active', label: 'Active' },
          { key: 'past', label: 'Past' },
          { key: 'all', label: 'All' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-500">
            {filter === 'active' ? 'No active bookings' : 
             filter === 'past' ? 'No past bookings' : 'No bookings found'}
          </div>
          {filter === 'active' && (
            <p className="mt-2 text-sm text-gray-400">
              Click "New Booking" to reserve a parking slot
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.booking_id}
              booking={booking}
              onCancel={cancelBooking}
            />
          ))}
        </div>
      )}
    </div>
  );
}

