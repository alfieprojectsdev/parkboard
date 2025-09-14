// components/BookingForm.tsx - Handle slot booking creation (MVP-ready)
"use client";

import { useState } from 'react';
import TimeRangePicker from './TimeRangePicker';
import SlotGrid from './SlotGrid';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthWrapper';

export default function BookingForm({ onSuccess }) {
  const { profile, user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState({ start: '', end: '' });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBooking = async () => {
    if (!selectedSlot || !selectedTimeRange.start || !selectedTimeRange.end) {
      setError('Please select a slot and time range.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    console.log({ profile, selectedSlot, selectedTimeRange });

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: profile.id,            // <-- from AuthWrapper
          slot_id: selectedSlot.slot_id,  // <-- must match DB type
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          status: 'confirmed',
          notes: '',
        })
,
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Booking failed');

      setSuccess('Booking successful!');
      onSuccess({ ...result, slot_number: selectedSlot.slot_number, slot_type: selectedSlot.slot_type });
      // onSuccess(Array.isArray(result) ? result[0] : result);
      
      // Reset form
      setSelectedSlot(null);
      setSelectedTimeRange({ start: '', end: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Book a Parking Slot</h2>
        <TimeRangePicker value={selectedTimeRange} onChange={setSelectedTimeRange} />
      </div>

      {selectedTimeRange.start && selectedTimeRange.end && (
        <SlotGrid
          selectedDate={selectedTimeRange.start?.slice(0, 10)}
          selectedTimeRange={selectedTimeRange}
          onSlotSelect={setSelectedSlot}
        />
      )}

      {selectedSlot && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800">Selected Slot</h3>
          <p className="text-blue-700">
            {selectedSlot.slot_number} ({selectedSlot.slot_type})
          </p>
          <p className="text-sm text-blue-600 mt-2">
            {new Date(selectedTimeRange.start).toLocaleString()} - {' '}
            {new Date(selectedTimeRange.end).toLocaleString()}
          </p>
          
          <button
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleBooking}
            disabled={loading}
          >
            {loading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          <strong>Success:</strong> {success}
        </div>
      )}
    </div>
  );
}