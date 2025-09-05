// =============================================================================
// BookingForm.js - Handle slot booking creation/editing
// =============================================================================

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BookingForm({ 
  selectedSlot, 
  existingBooking = null, 
  onSuccess, 
  onCancel 
}) {
  const [formData, setFormData] = useState({
    startTime: existingBooking?.start_time?.slice(0, 16) || '', // YYYY-MM-DDTHH:MM format
    endTime: existingBooking?.end_time?.slice(0, 16) || '',
    notes: existingBooking?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic validation
      if (new Date(formData.startTime) >= new Date(formData.endTime)) {
        throw new Error('End time must be after start time');
      }

      if (new Date(formData.startTime) < new Date()) {
        throw new Error('Cannot book slots in the past');
      }

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('booking_id')
        .eq('slot_id', selectedSlot.slot_id)
        .eq('status', 'confirmed')
        .lt('start_time', formData.endTime)
        .gt('end_time', formData.startTime)
        .neq('booking_id', existingBooking?.booking_id || 0);

      if (conflicts?.length > 0) {
        throw new Error('Time slot conflicts with existing booking');
      }

      // Create or update booking
      const bookingData = {
        slot_id: selectedSlot.slot_id,
        start_time: formData.startTime,
        end_time: formData.endTime,
        notes: formData.notes,
        status: 'confirmed'
      };

      let result;
      if (existingBooking) {
        result = await supabase
          .from('bookings')
          .update(bookingData)
          .eq('booking_id', existingBooking.booking_id)
          .select();
      } else {
        result = await supabase
          .from('bookings')
          .insert(bookingData)
          .select();
      }

      if (result.error) throw result.error;
      
      onSuccess(result.data[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">
        {existingBooking ? 'Edit Booking' : 'Book Slot'} - {selectedSlot?.slot_number}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Time</label>
          <input
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({...formData, startTime: e.target.value})}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">End Time</label>
          <input
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({...formData, endTime: e.target.value})}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            rows="3"
            placeholder="Any special notes or requests..."
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : existingBooking ? 'Update Booking' : 'Book Slot'}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

