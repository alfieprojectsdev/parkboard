// =============================================================================
// BookingForm.js - Handle slot booking creation/editing
// =============================================================================

import { useState } from 'react';
import TimeRangePicker from './TimeRangePicker';
import SlotGrid from './SlotGrid';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthWrapper';

export default function BookingForm({ onSuccess }) {
  const { profile } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState({ start: '', end: '' });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBooking = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile.id
        },
        body: JSON.stringify({
          slot_id: selectedSlot.slot_id,
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          notes: ''
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Booking failed');
      setSuccess('Booking successful!');
      onSuccess(result.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <TimeRangePicker value={selectedTimeRange} onChange={setSelectedTimeRange} />
      <SlotGrid
        selectedDate={selectedTimeRange.start?.slice(0, 10)}
        selectedTimeRange={selectedTimeRange}
        onSlotSelect={setSelectedSlot}
      />
      {selectedSlot && (
        <div className="mt-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleBooking}
            disabled={loading}
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ...inputs... */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto"
          >
            {loading ? 'Saving...' : existingBooking ? 'Update Booking' : 'Book Slot'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 w-full sm:w-auto"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

