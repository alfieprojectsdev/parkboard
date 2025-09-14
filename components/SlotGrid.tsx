// SlotGrid.tsx - Display available slots with booking capability
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SlotGrid({ 
  selectedDate, 
  selectedTimeRange,
  onSlotSelect,
  refreshTrigger = 0 
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableSlots();
  }, [selectedDate, selectedTimeRange, refreshTrigger]);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch all active slots
      const { data: allSlots, error: slotsError } = await supabase
        .from('parking_slots')
        .select('slot_id, slot_number, slot_type, status, description')
        .in('status', ['available', 'reserved']);

      if (slotsError) throw slotsError;

      // If time range is selected, check for conflicts
      if (selectedTimeRange?.start && selectedTimeRange?.end) {
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('slot_id')
          .eq('status', 'confirmed')
          .lt('start_time', selectedTimeRange.end)
          .gt('end_time', selectedTimeRange.start);

        if (bookingsError) throw bookingsError;

        const bookedSlotIds = new Set(bookings.map(b => b.slot_id));
        
        // Mark slots as available/booked
        const slotsWithAvailability = allSlots.map(slot => ({
          ...slot,
          isAvailable: slot.status === 'available' && !bookedSlotIds.has(slot.slot_id)
        }));

        setSlots(slotsWithAvailability);
      } else {
        // No time range selected, show all slots
        setSlots(allSlots.map(slot => ({
          ...slot,
          isAvailable: slot.status === 'available'
        })));
      }
    } catch (err: any) {
      setError('Failed to load parking slots');
      console.error(
    'Error fetching slots:',
    err?.error ?? err?.message ?? err);
    } finally {
      setLoading(false);
    }
  };

  const getSlotStatusColor = (slot) => {
    if (slot.status === 'maintenance') return 'bg-red-200 text-red-800';
    if (slot.status === 'reserved') return 'bg-yellow-200 text-yellow-800';
    if (!slot.isAvailable) return 'bg-gray-200 text-gray-600';
    return 'bg-green-200 text-green-800 hover:bg-green-300 cursor-pointer';
  };

  if (loading) {
    return <div className="text-center py-8">Loading parking slots...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-200 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-200 rounded"></div>
          <span>Maintenance</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-200 rounded"></div>
          <span>Reserved</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {slots.map((slot) => (
          <div key={slot.slot_id ?? slot.id}
            onClick={() =>
              slot.isAvailable &&
              slot.status === 'available' &&
              onSlotSelect({
                slot_id: slot.slot_id,       // real PK column
                slot_number: slot.slot_number,
                slot_type: slot.slot_type,
              })
              }
            className={`p-4 rounded-lg border text-center ${getSlotStatusColor(slot)} transition-all duration-150`}
          >
            <div className="font-bold text-base md:text-lg">{slot.slot_number}</div>
            <div className="text-xs capitalize mt-1">{slot.slot_type}</div>
            {slot.description && (
              <div className="text-xs text-gray-600 mt-1">{slot.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

