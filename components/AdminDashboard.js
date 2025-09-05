// =============================================================================
// AdminDashboard.js - Admin overview and management
// =============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      // Fetch bookings with user and slot info
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          user_profiles(name, unit_number, email),
          parking_slots(slot_number, slot_type)
        `)
        .order('start_time', { ascending: true });

      // Fetch all slots
      const { data: slotsData } = await supabase
        .from('parking_slots')
        .select('*')
        .order('slot_number');

      // Fetch all users
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('name');

      setBookings(bookingsData || []);
      setSlots(slotsData || []);
      setUsers(usersData || []);

      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayBookings = bookingsData?.filter(b => 
        new Date(b.start_time) >= today && 
        new Date(b.start_time) < new Date(today.getTime() + 24*60*60*1000) &&
        b.status === 'confirmed'
      ) || [];

      setStats({
        totalSlots: slotsData?.length || 0,
        availableSlots: slotsData?.filter(s => s.status === 'available').length || 0,
        todayBookings: todayBookings.length,
        totalUsers: usersData?.length || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSlotStatus = async (slotId, newStatus) => {
    try {
      await supabase
        .from('parking_slots')
        .update({ status: newStatus })
        .eq('slot_id', slotId);
      
      fetchDashboardData(); // Refresh
    } catch (error) {
      console.error('Error updating slot status:', error);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('booking_id', bookingId);
      
      fetchDashboardData(); // Refresh
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-800">{stats.totalSlots}</div>
          <div className="text-blue-600">Total Slots</div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-800">{stats.availableSlots}</div>
          <div className="text-green-600">Available</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-800">{stats.todayBookings}</div>
          <div className="text-yellow-600">Today's Bookings</div>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-800">{stats.totalUsers}</div>
          <div className="text-purple-600">Total Users</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['bookings', 'slots', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'bookings' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.slice(0, 20).map((booking) => (
                <tr key={booking.booking_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.user_profiles?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.user_profiles?.unit_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.parking_slots?.slot_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(booking.start_time).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(booking.start_time).toLocaleTimeString()} - {new Date(booking.end_time).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => cancelBooking(booking.booking_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'slots' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map((slot) => (
            <div key={slot.slot_id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{slot.slot_number}</h3>
                  <p className="text-sm text-gray-500 capitalize">{slot.slot_type}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  slot.status === 'available' ? 'bg-green-100 text-green-800' :
                  slot.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {slot.status}
                </span>
              </div>
              
              {slot.description && (
                <p className="text-sm text-gray-600 mb-3">{slot.description}</p>
              )}
              
              <div className="flex space-x-2">
                <select
                  value={slot.status}
                  onChange={(e) => updateSlotStatus(slot.slot_id, e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.unit_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.vehicle_plate || 'Not provided'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}