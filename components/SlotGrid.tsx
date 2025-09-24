// SlotGrid.tsx - Display available slots with booking capability (clean version)
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import React from "react";

type Slot = {
  slot_id: string | number;
  slot_number?: string;
  slot_type?: string;
  isAvailable?: boolean;
  status?: string;
};

export default function SlotGrid(props: {
  onSlotSelect: (s: { slot_id: string | number; slot_number?: string; slot_type?: string }) => void;
  selectedSlotId?: string | number | null;
  selected?: { slot_id?: string | number } | null;
  selectedDate?: string;
  selectedTimeRange?: { start: string; end: string };
}) {
  const {
    onSlotSelect,
    selectedSlotId,
    selected,
    selectedDate,
    selectedTimeRange,
  } = props;

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selId = selectedSlotId ?? selected?.slot_id ?? null;

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !selectedTimeRange?.start || !selectedTimeRange?.end) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: allSlots, error: slotsError } = await supabase
          .from('parking_slots')
          .select('slot_id, slot_number, slot_type, status, description')
          .eq('status', 'available');

        if (slotsError) throw slotsError;

        // Check availability for each slot with proper error handling
        const slotsWithAvailability = await Promise.all(
          (allSlots || []).map(async (slot) => {
            try {
              const { data: conflicts, error: conflictsError } = await supabase
                .from('bookings')
                .select('booking_id')
                .eq('slot_id', slot.slot_id)
                .eq('status', 'confirmed')
                .or(`and(start_time.lt.${selectedTimeRange.end},end_time.gt.${selectedTimeRange.start})`);

              if (conflictsError) {
                console.error('Error checking slot availability:', conflictsError);
                return { ...slot, isAvailable: true }; // Fallback to available
              }

              return {
                ...slot,
                isAvailable: !conflicts || conflicts.length === 0
              };
            } catch (networkError) {
              console.error('Network error checking slot availability:', networkError);
              return { ...slot, isAvailable: true }; // Fallback to available
            }
          })
        );

        setSlots(slotsWithAvailability);
      } catch (err: any) {
        console.error('Error fetching slots:', err);
        setError(err.message || 'Failed to load slots');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, selectedTimeRange?.start, selectedTimeRange?.end]);

  const getSlotStatusColor = (slot: Slot) => {
    if (!slot.isAvailable) {
      return "bg-gray-200 border-gray-300";
    }
    if (selId !== null && selId === slot.slot_id) {
      return "bg-blue-100 border-blue-500 ring-2 ring-blue-300";
    }
    return "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50";
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <div className="text-gray-600">Loading parking slots...</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  if (slots.length === 0) {
    return <div className="text-gray-600 text-center py-8">No available slots for the selected time</div>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Available Slots</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {slots.map((slot) => {
          const available = !!slot.isAvailable;
          const badgeText = available ? "Available" : slot.status === "reserved" ? "Reserved" : "Unavailable";

          return (
            <button
              key={slot.slot_id}
              onClick={() =>
                available &&
                onSlotSelect({
                  slot_id: slot.slot_id,
                  slot_number: slot.slot_number,
                  slot_type: slot.slot_type,
                })
              }
              disabled={!available}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-transform duration-100 transform ${getSlotStatusColor(
                slot
              )} ${available ? "hover:scale-[1.02] cursor-pointer" : "opacity-80 cursor-not-allowed"}`}
              aria-pressed={selId !== null && selId === slot.slot_id}
              aria-label={`${slot.slot_number ?? slot.slot_id} - ${slot.slot_type ?? ""} - ${badgeText}`}
            >
              <div className="text-sm font-semibold">{slot.slot_number ?? slot.slot_id}</div>
              <div className="text-xs text-gray-700 capitalize">{slot.slot_type ?? "–"}</div>

              <span
                className={`mt-2 inline-block px-2 py-0.5 text-xs rounded-full ${
                  available ? "bg-green-700 text-white" : slot.status === "reserved" ? "bg-yellow-700 text-white" : "bg-gray-300 text-gray-800"
                }`}
              >
                {badgeText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}