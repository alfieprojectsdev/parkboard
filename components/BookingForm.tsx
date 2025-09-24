// components/BookingForm.tsx - Handle slot booking creation with network resilience
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
    // Prevent accidental submits: both slot + time required
    if (!selectedSlot || !selectedTimeRange.start || !selectedTimeRange.end) {
      setError('Please select a slot and time range.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: profile.id,
          slot_id: selectedSlot.slot_id,
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          status: 'confirmed',
          notes: '',
        }),
      });

      // Check if the response is ok
      if (!res.ok) {
        // Try to get error message from response
        let errorMessage = 'Booking failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response, use status text
          errorMessage = `Booking failed: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();

      // Prefer the server-provided relation if available; otherwise attach selectedSlot info.
      const bookingResult =
        result && result.parking_slots
          ? result
          : {
              ...result,
              parking_slots: {
                slot_number: selectedSlot.slot_number,
                slot_type: selectedSlot.slot_type,
              },
            };

      setSuccess('Booking successful!');
      onSuccess(bookingResult);

      // Reset form
      setSelectedSlot(null);
      setSelectedTimeRange({ start: '', end: '' });
    } catch (err: any) {
      console.error('Booking error:', err);
      
      // Handle different types of errors
      if (err.message.includes('fetch failed') || err.message.includes('TypeError')) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else if (err.message.includes('already booked')) {
        setError('This slot is already booked for the selected time. Please choose a different slot or time.');
      } else if (err.message.includes('500')) {
        setError('Server error occurred. Please try again in a moment.');
      } else {
        setError(err?.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Book a Parking Slot</h2>
        
        {/* Network Status Indicator */}
        {error && error.includes('Network') && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-yellow-800 font-medium">Network Issue Detected</p>
                <p className="text-yellow-700 text-sm">Slots are shown as available due to connectivity issues. Your booking may still work.</p>
              </div>
            </div>
          </div>
        )}
        
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
            className="mt-4 inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={handleBooking}
            disabled={loading || !selectedSlot || !selectedTimeRange.start || !selectedTimeRange.end}
            aria-busy={loading}
            aria-disabled={loading || !selectedSlot}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 mr-2 border-2 border-white/50 rounded-full" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            )}
            {loading ? 'Saving booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <strong>Error:</strong> {error}
              {error.includes('Network') && (
                <div className="mt-2">
                  <button 
                    onClick={handleBooking}
                    disabled={loading}
                    className="text-sm underline hover:no-underline"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
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