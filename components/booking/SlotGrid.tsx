// =====================================================
// File: components/booking/SlotGrid.tsx
// Display available slots with booking capability 
// Updated with ownership display
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import React from "react";

type Slot = {
  slot_id: string | number;
  slot_number?: string;
  slot_type?: string;
  isAvailable?: boolean;
  status?: string;
  owner_id?: string | null;
  description?: string;
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

  const { profile } = useAuth();
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
        // Fetch all slots including ownership info
        const { data: allSlots, error: slotsError } = await supabase
          .from('parking_slots')
          .select('slot_id, slot_number, slot_type, status, description, owner_id')
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
                return { ...slot, isAvailable: true };
              }

              const hasConflicts = conflicts && conflicts.length > 0;
              const isOwned = slot.owner_id === profile?.id;
              const isShared = !slot.owner_id;
              const isOwnedByOther = slot.owner_id && slot.owner_id !== profile?.id;

              return {
                ...slot,
                isAvailable: !hasConflicts,
                isOwned,
                isShared,
                canBook: !hasConflicts && (isOwned || isShared),
                isOwnedByOther
              };
            } catch (networkError) {
              console.error('Network error checking slot availability:', networkError);
              return { ...slot, isAvailable: true };
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
  }, [selectedDate, selectedTimeRange?.start, selectedTimeRange?.end, profile?.id]);

  const getSlotStatusColor = (slot: any) => {
    if (!slot.isAvailable) {
      return "bg-gray-200 border-gray-300";
    }
    if (slot.isOwnedByOther) {
      return "bg-red-50 border-red-200";
    }
    if (selId !== null && selId === slot.slot_id) {
      return "bg-blue-100 border-blue-500 ring-2 ring-blue-300";
    }
    if (slot.isOwned) {
      return "bg-green-50 border-green-300 hover:border-green-500 hover:bg-green-100";
    }
    return "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50";
  };

  const getSlotBadge = (slot: any) => {
    if (slot.isOwned) {
      return { text: "Your Slot", className: "bg-blue-100 text-blue-800" };
    }
    if (slot.isOwnedByOther) {
      return { text: "Reserved", className: "bg-red-100 text-red-800" };
    }
    if (!slot.isAvailable) {
      return { text: "Booked", className: "bg-gray-300 text-gray-800" };
    }
    if (slot.slot_type === 'visitor') {
      return { text: "Visitor", className: "bg-purple-100 text-purple-800" };
    }
    return { text: "Available", className: "bg-green-100 text-green-800" };
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

  // Sort slots: owned first, then shared, then unavailable
  const sortedSlots = [...slots].sort((a: any, b: any) => {
    if (a.isOwned && !b.isOwned) return -1;
    if (!a.isOwned && b.isOwned) return 1;
    if (a.isShared && !b.isShared) return -1;
    if (!a.isShared && b.isShared) return 1;
    return 0;
  });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Available Slots</h3>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
          <span>Your Slots</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
          <span>Shared</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
          <span>Booked</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sortedSlots.map((slot: any) => {
          const canBook = slot.canBook;
          const badge = getSlotBadge(slot);

          return (
            <button
              key={slot.slot_id}
              onClick={() =>
                canBook &&
                onSlotSelect({
                  slot_id: slot.slot_id,
                  slot_number: slot.slot_number,
                  slot_type: slot.slot_type,
                })
              }
              disabled={!canBook}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-100 transform ${getSlotStatusColor(
                slot
              )} ${canBook ? "hover:scale-[1.02] cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
              aria-pressed={selId !== null && selId === slot.slot_id}
              aria-label={`${slot.slot_number ?? slot.slot_id} - ${slot.slot_type ?? ""} - ${badge.text}`}
            >
              <div className="text-sm font-semibold">{slot.slot_number ?? slot.slot_id}</div>
              <div className="text-xs text-gray-700 capitalize">{slot.slot_type ?? "—"}</div>

              <span className={`mt-2 inline-block px-2 py-0.5 text-xs rounded-full ${badge.className}`}>
                {badge.text}
              </span>
              
              {slot.description && (
                <div className="mt-1 text-xs text-gray-500 text-center">{slot.description}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

