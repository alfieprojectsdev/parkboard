// =====================================================
// File: components/booking/BookingForm.improved.tsx
// EXAMPLE: Refactored with non-blocking toast notifications
// Replace the original BookingForm.tsx with this after testing
// =====================================================
"use client";

import { useState } from 'react';
import TimeRangePicker from './TimeRangePicker';
import SlotGrid from './SlotGrid';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import { useToast } from '@/components/common/ToastNotification';
import { BOOKING_RULES } from '@/lib/constants';

export default function BookingForm({ onSuccess }: { onSuccess: (booking: any) => void }) {
  const { profile, user } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [selectedTimeRange, setSelectedTimeRange] = useState({ start: '', end: '' });
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const validateBooking = () => {
    if (!selectedSlot) {
      showWarning('Please select a parking slot.');
      return false;
    }

    if (!selectedTimeRange.start || !selectedTimeRange.end) {
      showWarning('Please select both start and end times.');
      return false;
    }

    const start = new Date(selectedTimeRange.start);
    const end = new Date(selectedTimeRange.end);
    const now = new Date();

    // Check duration limits
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (durationHours < BOOKING_RULES.MIN_DURATION_HOURS) {
      showError(`Minimum booking duration is ${BOOKING_RULES.MIN_DURATION_HOURS} hour(s)`);
      return false;
    }

    if (durationHours > BOOKING_RULES.MAX_DURATION_HOURS) {
      showError(`Maximum booking duration is ${BOOKING_RULES.MAX_DURATION_HOURS} hours`);
      return false;
    }

    // Check advance booking limit
    const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysInAdvance > BOOKING_RULES.MAX_ADVANCE_DAYS) {
      showError(`Cannot book more than ${BOOKING_RULES.MAX_ADVANCE_DAYS} days in advance`);
      return false;
    }

    return true;
  };

  const handleBooking = async () => {
    if (!validateBooking()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: profile?.id,
          slot_id: selectedSlot.slot_id,
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          status: 'confirmed',
          notes: '',
        }),
      });

      if (!res.ok) {
        let errorMessage = 'Booking failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Booking failed: ${res.status} ${res.statusText}`;
        }

        // Instead of throw new Error, use toast
        if (errorMessage.includes('already booked')) {
          showError('This slot is already booked for the selected time. Please choose a different slot or time.');
        } else if (errorMessage.includes('reserved for another')) {
          showError('This slot is reserved for another resident. Please select a different slot.');
        } else {
          showError(errorMessage);
        }
        return; // Exit early instead of throwing
      }

      const result = await res.json();

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

      showSuccess('Booking confirmed successfully!');

      // Reset form
      setSelectedSlot(null);
      setSelectedTimeRange({ start: '', end: '' });

      // Callback after short delay for better UX
      setTimeout(() => {
        onSuccess(bookingResult);
      }, 1000);

    } catch (err: any) {
      console.error('Booking error:', err);

      // Categorize errors and show appropriate toast
      if (err.message.includes('fetch failed') || err.message.includes('TypeError')) {
        showError('Network connection error. Please check your internet and try again.');
      } else if (err.message.includes('500')) {
        showError('Server error occurred. Please try again in a moment.');
      } else if (err.message.includes('past')) {
        showError('Cannot book slots in the past. Please select a future time.');
      } else {
        showError(err?.message || 'An unexpected error occurred. Please try again.');
      }
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
            className="mt-4 inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={handleBooking}
            disabled={loading || !selectedSlot || !selectedTimeRange.start || !selectedTimeRange.end}
            aria-busy={loading}
            aria-disabled={loading || !selectedSlot}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            )}
            {loading ? 'Saving booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  );
}