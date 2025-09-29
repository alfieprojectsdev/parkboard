// ===============================================================================  
// app/slots/page.tsx - Simplified slots view (optional/admin use)
// ===============================================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/common/Navigation';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { useAuth } from '@/components/auth/AuthWrapper';

export default function SlotsPage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('parking_slots')
      .select('*')
      .order('slot_number', { ascending: true });
    
    if (!error) {
      setSlots(data || []);
    }
    setLoading(false);
  };

  const updateSlotStatus = async (slotId, newStatus) => {
    if (profile?.role !== 'admin') {
      alert('Only administrators can update slot status');
      return;
    }

    const { error } = await supabase
      .from('parking_slots')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('slot_id', slotId);

    if (!error) {
      fetchSlots();
    } else {
      alert('Error updating slot: ' + error.message);
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">All Parking Slots</h1>
            <p className="text-gray-600 mt-2">
              View all parking slots and their current status
              {profile?.role === 'admin' && ' (Admin: Click status to change)'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slot Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slots.map((slot) => (
                  <tr key={slot.slot_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {slot.slot_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {slot.slot_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {profile?.role === 'admin' ? (
                        <select
                          value={slot.status}
                          onChange={(e) => updateSlotStatus(slot.slot_id, e.target.value)}
                          className={`px-2 py-1 text-xs rounded-full border ${
                            slot.status === 'available' 
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : slot.status === 'maintenance'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          <option value="available">Available</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="reserved">Reserved</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          slot.status === 'available' 
                            ? 'bg-green-100 text-green-800'
                            : slot.status === 'maintenance'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {slot.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {slot.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {slots.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No parking slots found
            </div>
          )}
        </main>
      </div>
    </AuthWrapper>
  );
}