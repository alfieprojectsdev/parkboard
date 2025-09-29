// =====================================================
// File: components/dashboard/MySlots.tsx
// Component to show user's owned slots
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';

export default function MySlots() {
  const { profile } = useAuth();
  const [ownedSlots, setOwnedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMySlots = async () => {
      if (!profile?.id) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('owner_id', profile.id)
        .order('slot_number');
      
      if (!error) {
        setOwnedSlots(data || []);
      }
      setLoading(false);
    };
    
    fetchMySlots();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="animate-pulse bg-blue-50 rounded-lg p-4">
        <div className="h-4 bg-blue-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-blue-100 rounded w-1/2"></div>
      </div>
    );
  }

  if (ownedSlots.length === 0) {
    return null; // Don't show anything if user has no owned slots
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Your Assigned Parking Slots
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ownedSlots.map(slot => (
          <div key={slot.slot_id} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-900">
                  Slot {slot.slot_number}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {slot.slot_type} parking
                </div>
                {slot.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {slot.description}
                  </div>
                )}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                slot.status === 'available' 
                  ? 'bg-green-100 text-green-800'
                  : slot.status === 'maintenance'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {slot.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-blue-700">
        💡 You can book your assigned slots anytime they're available
      </div>
    </div>
  );
}

