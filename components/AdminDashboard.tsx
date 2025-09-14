// =============================================================================
// AdminDashboard.js - Admin overview and management
// =============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import SlotGrid from './SlotGrid';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    // Bookings
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*, user_profiles(name, unit_number, email), parking_slots(slot_number, slot_type)')
      .order('start_time', { ascending: true });
    // Slots
    const { data: slotsData } = await supabase
      .from('parking_slots')
      .select('*')
      .order('slot_number');
    // Users
    const { data: usersData } = await supabase
      .from('user_profiles')
      .select('*')
      .order('name');
    setBookings(bookingsData || []);
    setSlots(slotsData || []);
    setUsers(usersData || []);
    setLoading(false);
  };

  const updateSlotStatus = async (slotId, newStatus) => {
    await supabase
      .from('parking_slots')
      .update({ status: newStatus })
      .eq('slot_id', slotId);
    fetchDashboardData();
  };

  const changeUserRole = async (userId, newRole) => {
    await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);
    fetchDashboardData();
  };

  if (loading) return <div>Loading admin dashboard...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex space-x-4 mb-6">
        {['bookings', 'slots', 'users'].map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div key={booking.booking_id} className="border rounded p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{booking.parking_slots?.slot_number}</div>
                <div className="text-sm">{booking.user_profiles?.name} ({booking.user_profiles?.unit_number})</div>
                <div className="text-xs">{new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleString()}</div>
                <div className="text-xs">Status: {booking.status}</div>
              </div>
              {/* Admin can cancel booking */}
              {booking.status === 'confirmed' && (
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={async () => {
                    await supabase
                      .from('bookings')
                      .update({ status: 'cancelled' })
                      .eq('booking_id', booking.booking_id);
                    fetchDashboardData();
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'slots' && (
        <div className="space-y-4">
          {slots.map(slot => (
            <div key={slot.slot_id} className="border rounded p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{slot.slot_number}</div>
                <div className="text-xs">{slot.slot_type}</div>
                <div className="text-xs">{slot.description}</div>
                <div className="text-xs">Status: {slot.status}</div>
              </div>
              <select
                value={slot.status}
                onChange={e => updateSlotStatus(slot.slot_id, e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="border rounded p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{user.name}</div>
                <div className="text-xs">{user.unit_number}</div>
                <div className="text-xs">{user.email}</div>
                <div className="text-xs">Role: {user.role}</div>
                <div className="text-xs">{user.vehicle_plate}</div>
              </div>
              <select
                value={user.role}
                onChange={e => changeUserRole(user.id, e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="resident">Resident</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}