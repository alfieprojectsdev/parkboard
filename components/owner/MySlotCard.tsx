// components/owner/MySlotCard.tsx
"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface MySlotCardProps {
  slot: any;
  onUpdate: () => void;
}

export default function MySlotCard({ slot, onUpdate }: MySlotCardProps) {
  const [isListed, setIsListed] = useState(slot.is_listed_for_rent);

  const toggleListing = async () => {
    const newStatus = !isListed;

    const { error } = await supabase
      .from('parking_slots')
      .update({ is_listed_for_rent: newStatus })
      .eq('slot_id', slot.slot_id);

    if (!error) {
      setIsListed(newStatus);
      onUpdate();
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{slot.slot_number}</h3>
          <p className="text-sm text-gray-600">{slot.slot_type}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isListed
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isListed ? '🟢 Listed' : '⚫ Not Listed'}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Hourly Rate:</span>
          <span className="font-medium">₱{slot.rental_rate_hourly}/hr</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Daily Rate:</span>
          <span className="font-medium">₱{slot.rental_rate_daily}/day</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={toggleListing}
          className={`flex-1 px-4 py-2 rounded-lg font-medium ${
            isListed
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isListed ? 'Unlist' : 'List for Rent'}
        </button>
        <button
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Edit Details
        </button>
      </div>
    </div>
  );
}
