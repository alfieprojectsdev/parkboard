// components/admin/AdminDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
    try {
      console.log('🔍 Fetching from /api/admin/bookings...');
      const bookingsResponse = await fetch('/api/admin/bookings');
      const bookingsJson = await bookingsResponse.json();
      
      console.log('📊 Response status:', bookingsResponse.status);
      console.log('📋 Number of bookings:', bookingsJson.bookings?.length || 0);

      const { data: slotsData } = await supabase
        .from('parking_slots')
        .select('*')
        .order('slot_number');

      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('name');
        
      setBookings(bookingsJson.bookings || []);
      setSlots(slotsData || []);
      setUsers(usersData || []);
      
    } catch (error) {
      console.error('❌ Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bookings Management</h1>
        <p className="text-gray-600 mt-1">Manage all parking bookings, slots, and users</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['bookings', 'slots', 'users'].map(tab => (
            <button
              key={tab}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 font-medium">
              📊 Showing {bookings.length} total booking{bookings.length !== 1 ? 's' : ''} from all users
            </p>
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500">No bookings found</p>
            </div>
          ) : (
            bookings.map(booking => (
              <div key={booking.booking_id} className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-bold text-2xl text-purple-600">
                        {booking.parking_slots?.slot_number}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-700 w-20">User:</span>
                        <span className="text-gray-900">{booking.user_profiles?.name} ({booking.user_profiles?.unit_number})</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-700 w-20">Email:</span>
                        <span className="text-gray-600">{booking.user_profiles?.email}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-700 w-20">Start:</span>
                        <span className="text-gray-600">{new Date(booking.start_time).toLocaleString()}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-700 w-20">End:</span>
                        <span className="text-gray-600">{new Date(booking.end_time).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {booking.status === 'confirmed' && (
                    <button
                      className="ml-6 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold shadow-sm"
                      onClick={async () => {
                        if (confirm(`Cancel booking for ${booking.user_profiles?.name}?`)) {
                          await supabase
                            .from('bookings')
                            .update({ status: 'cancelled' })
                            .eq('booking_id', booking.booking_id);
                          fetchDashboardData();
                        }
                      }}
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Slots Tab */}
      {activeTab === 'slots' && (
        <div className="space-y-4">
          {slots.map(slot => (
            <div key={slot.slot_id} className="border rounded-lg p-6 bg-white shadow-sm flex justify-between items-center">
              <div>
                <div className="font-bold text-xl text-gray-900">{slot.slot_number}</div>
                <div className="text-sm text-gray-600 mt-1">Type: <span className="font-medium">{slot.slot_type}</span></div>
                <div className="text-sm text-gray-500 mt-1">{slot.description || 'No description'}</div>
                <div className="text-sm mt-2">
                  Status: <span className={`font-semibold ${
                    slot.status === 'available' ? 'text-green-600' : 
                    slot.status === 'maintenance' ? 'text-yellow-600' : 
                    'text-gray-600'
                  }`}>{slot.status}</span>
                </div>
              </div>
              <select
                value={slot.status}
                onChange={e => updateSlotStatus(slot.slot_id, e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="border rounded-lg p-6 bg-white shadow-sm flex justify-between items-center">
              <div>
                <div className="font-bold text-xl text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Unit:</span> {user.unit_number}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {user.email}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  <span className="font-medium">Vehicle:</span> {user.vehicle_plate || 'Not provided'}
                </div>
                <div className="text-sm mt-2">
                  <span className="font-medium">Role:</span> <span className={`font-bold ${
                    user.role === 'admin' ? 'text-purple-600' : 'text-blue-600'
                  }`}>{user.role}</span>
                </div>
              </div>
              <select
                value={user.role}
                onChange={e => changeUserRole(user.id, e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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