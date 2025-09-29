# ParkBoard Project Code Export
Generated on: Saturday, 27 September, 2025 12:12:17 AM PST

## Core Application Code

```typescript
// ./app/about/page.tsx

// app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About ParkBoard</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Our Mission</h2>
            <p className="text-gray-600">
              ParkBoard simplifies parking management for residential communities, making it easy for residents to book parking slots and for administrators to manage facility usage efficiently.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Features</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Real-time parking slot availability</li>
              <li>Easy booking and cancellation</li>
              <li>Mobile-friendly interface</li>
              <li>Admin tools for slot management</li>
              <li>Booking history and tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Contact</h2>
            <p className="text-gray-600">
              For support or inquiries, please contact your building administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// ./app/admin/AdminDashboardContent.tsx

// app/admin/AdminDashboardContent.tsx - Separated content that uses useAuth
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

export default function AdminDashboardContent() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSlots: 0,
    activeBookings: 0,
    todayBookings: 0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      window.location.href = '/dashboard';
    } else {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch stats
      const [usersRes, slotsRes, bookingsRes] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('parking_slots').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*').eq('status', 'confirmed')
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayBookings = bookingsRes.data?.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === today.getTime();
      }).length || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalSlots: slotsRes.count || 0,
        activeBookings: bookingsRes.data?.length || 0,
        todayBookings
      });

      // Fetch recent bookings with user info
      const { data: recentData } = await supabase
        .from('bookings')
        .select('*, user_profiles!inner(name, unit_number), parking_slots(slot_number, slot_type)')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentBookings(recentData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Total Users</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Total Slots</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.totalSlots}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Active Bookings</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.activeBookings}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">Today's Bookings</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.todayBookings}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Bookings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/admin/slots"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700">Manage Parking Slots</span>
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700">Manage Users</span>
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/bookings"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700">View All Bookings</span>
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <div key={booking.booking_id} className="border-b border-gray-100 pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {booking.user_profiles?.name} - Unit {booking.user_profiles?.unit_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          Slot {booking.parking_slots?.slot_number} • {new Date(booking.start_time).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recent bookings</p>
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// ./app/admin/page.tsx

// app/admin/page.tsx - Fixed with AuthWrapper
"use client";

import AuthWrapper from '@/components/auth/AuthWrapper';
import AdminDashboardContent from './AdminDashboardContent';

export default function AdminPage() {
  return (
    <AuthWrapper>
      <AdminDashboardContent />
    </AuthWrapper>
  );
}
```

```typescript
// ./app/admin/slots/page.tsx

// =====================================================
// File: app/admin/slots/page.tsx
// Admin slot management
// Updated admin page with owner assignment
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

export default function AdminSlotsPage() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [formData, setFormData] = useState({
    slot_number: '',
    slot_type: 'uncovered',
    status: 'available',
    description: '',
    owner_id: ''
  });

  useEffect(() => {
    if (profile?.role !== 'admin') {
      window.location.href = '/dashboard';
    } else {
      fetchSlots();
      fetchUsers();
    }
  }, [profile]);

  const fetchSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('parking_slots')
      .select('*, owner:user_profiles!parking_slots_owner_id_fkey(name, unit_number)')
      .order('slot_number');
    
    if (!error) {
      setSlots(data || []);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, name, unit_number')
      .order('name');
    setUsers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slotData = {
      slot_number: formData.slot_number,
      slot_type: formData.slot_type,
      status: formData.status,
      description: formData.description,
      owner_id: formData.owner_id || null,
      updated_at: new Date().toISOString()
    };

    if (editingSlot) {
      const { error } = await supabase
        .from('parking_slots')
        .update(slotData)
        .eq('slot_id', editingSlot.slot_id);

      if (!error) {
        setEditingSlot(null);
        fetchSlots();
      } else {
        alert('Error updating slot: ' + error.message);
      }
    } else {
      const { error } = await supabase
        .from('parking_slots')
        .insert([slotData]);

      if (!error) {
        setIsAddingSlot(false);
        setFormData({
          slot_number: '',
          slot_type: 'uncovered',
          status: 'available',
          description: '',
          owner_id: ''
        });
        fetchSlots();
      } else {
        alert('Error adding slot: ' + error.message);
      }
    }
  };

  const handleEdit = (slot: any) => {
    setEditingSlot(slot);
    setFormData({
      slot_number: slot.slot_number,
      slot_type: slot.slot_type,
      status: slot.status,
      description: slot.description || '',
      owner_id: slot.owner_id || ''
    });
    setIsAddingSlot(true);
  };

  const handleDelete = async (slotId: number) => {
    if (!confirm('Are you sure you want to delete this slot?')) return;

    const { error } = await supabase
      .from('parking_slots')
      .delete()
      .eq('slot_id', slotId);

    if (!error) {
      fetchSlots();
    } else {
      alert('Error deleting slot: ' + error.message);
    }
  };

  const handleCancel = () => {
    setIsAddingSlot(false);
    setEditingSlot(null);
    setFormData({
      slot_number: '',
      slot_type: 'uncovered',
      status: 'available',
      description: '',
      owner_id: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Parking Slots</h1>
          {!isAddingSlot && (
            <button
              onClick={() => setIsAddingSlot(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add New Slot
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {isAddingSlot && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingSlot ? 'Edit Slot' : 'Add New Slot'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slot Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slot_number}
                    onChange={(e) => setFormData({...formData, slot_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., A-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slot Type
                  </label>
                  <select
                    value={formData.slot_type}
                    onChange={(e) => setFormData({...formData, slot_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="covered">Covered</option>
                    <option value="uncovered">Uncovered</option>
                    <option value="visitor">Visitor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner (leave empty for shared/visitor)
                  </label>
                  <select
                    value={formData.owner_id}
                    onChange={(e) => setFormData({...formData, owner_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Shared/Visitor Slot</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} - Unit {user.unit_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Near elevator, Compact cars only"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingSlot ? 'Update Slot' : 'Add Slot'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Slots Table */}
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
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      slot.status === 'available' 
                        ? 'bg-green-100 text-green-800'
                        : slot.status === 'maintenance'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {slot.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {slot.owner ? `${slot.owner.name} (Unit ${slot.owner.unit_number})` : 'Shared'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {slot.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(slot)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(slot.slot_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Slots</div>
            <div className="text-2xl font-bold text-gray-900">{slots.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Owned Slots</div>
            <div className="text-2xl font-bold text-gray-900">
              {slots.filter(s => s.owner_id).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Shared Slots</div>
            <div className="text-2xl font-bold text-gray-900">
              {slots.filter(s => !s.owner_id).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Available</div>
            <div className="text-2xl font-bold text-gray-900">
              {slots.filter(s => s.status === 'available').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// ./app/admin/users/page.tsx

// app/admin/users/page.tsx - Admin user management
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile?.role !== 'admin') {
      window.location.href = '/dashboard';
    } else {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('name');
    
    if (!error) {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (!error) {
      fetchUsers();
      alert('User role updated successfully');
    } else {
      alert('Error updating user role: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.unit_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.vehicle_plate || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={user.id === profile.id} // Can't change own role
                    >
                      <option value="resident">Resident</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching your search
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Residents</div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'resident').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Admins</div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// ./app/api/bookings/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("bookings").select("*").eq("booking_id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.status && !BOOKING_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${BOOKING_STATUSES.join(", ")}` }, { status: 400 });

    if (body.start_time && body.end_time && new Date(body.end_time) <= new Date(body.start_time))
      return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });

    const { data, error } = await supabase.from("bookings").update(body).eq("booking_id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("bookings").delete().eq("booking_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/bookings/route.ts

// =====================================================
// File: app/api/bookings/route.ts
// Updated booking API with ownership validation
// =====================================================
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for server-side operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"];

export async function GET(req: NextRequest) {
  try {
    // Get user_id from query params or headers
    const userId = req.nextUrl.searchParams.get('user_id') || req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, parking_slots(slot_number, slot_type, owner_id)")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .order("start_time", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  if (!body.user_id || !body.slot_id || !body.start_time || !body.end_time) {
    return NextResponse.json(
      { error: "Missing required fields: user_id, slot_id, start_time, end_time" },
      { status: 400 }
    );
  }

  // Validate booking duration limits
  const start = new Date(body.start_time);
  const end = new Date(body.end_time);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  const MIN_DURATION_HOURS = 1;
  const MAX_DURATION_HOURS = 24;
  const MAX_ADVANCE_DAYS = 30;
  
  if (durationHours < MIN_DURATION_HOURS) {
    return NextResponse.json(
      { error: `Minimum booking duration is ${MIN_DURATION_HOURS} hour(s)` },
      { status: 400 }
    );
  }
  
  if (durationHours > MAX_DURATION_HOURS) {
    return NextResponse.json(
      { error: `Maximum booking duration is ${MAX_DURATION_HOURS} hours` },
      { status: 400 }
    );
  }
  
  const now = new Date();
  const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysInAdvance > MAX_ADVANCE_DAYS) {
    return NextResponse.json(
      { error: `Cannot book more than ${MAX_ADVANCE_DAYS} days in advance` },
      { status: 400 }
    );
  }

  // Status validation
  if (body.status && !BOOKING_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of ${BOOKING_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (new Date(body.end_time) <= new Date(body.start_time)) {
    return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
  }

  // Check slot ownership
  const { data: slot, error: slotError } = await supabase
    .from("parking_slots")
    .select("owner_id, status")
    .eq("slot_id", body.slot_id)
    .single();

  if (slotError || !slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.status !== 'available') {
    return NextResponse.json(
      { error: `Slot is currently ${slot.status}` },
      { status: 400 }
    );
  }

  // Check if slot is owned by someone else
  if (slot.owner_id && slot.owner_id !== body.user_id) {
    return NextResponse.json(
      { error: "This slot is reserved for another resident" },
      { status: 403 }
    );
  }

  // Overlap check
  const { data: existing, error: checkErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("slot_id", body.slot_id)
    .eq("status", "confirmed")
    .or(`and(start_time.lt.${body.end_time},end_time.gt.${body.start_time})`);

  if (checkErr)
    return NextResponse.json({ error: "Error checking existing bookings: " + checkErr.message }, { status: 500 });

  if (existing?.length)
    return NextResponse.json({ error: "Slot is already booked for this time period" }, { status: 409 });

  // Insert
  const { data, error } = await supabase
    .from("bookings")
    .insert([{ ...body, status: body.status || "confirmed" }])
    .select("*, parking_slots(slot_number, slot_type, owner_id)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

```typescript
// ./app/api/payments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const PAYMENT_METHODS = ["cash", "gcash", "bank_transfer", "free"];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("payments").select("*").eq("payment_id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.payment_method && !PAYMENT_METHODS.includes(body.payment_method))
      return NextResponse.json({ error: `Invalid payment_method. Must be one of ${PAYMENT_METHODS.join(", ")}` }, { status: 400 });

    if (body.status && !PAYMENT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${PAYMENT_STATUSES.join(", ")}` }, { status: 400 });

    if (body.amount && body.amount < 0)
      return NextResponse.json({ error: "amount must be >= 0" }, { status: 400 });

    const { data, error } = await supabase.from("payments").update(body).eq("payment_id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("payments").delete().eq("payment_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/payments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const PAYMENT_METHODS = ["cash", "gcash", "bank_transfer", "free"];
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

export async function GET() {
  const { data, error } = await supabase.from("payments").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!PAYMENT_METHODS.includes(body.payment_method))
      return NextResponse.json({ error: `Invalid payment_method. Must be one of ${PAYMENT_METHODS.join(", ")}` }, { status: 400 });

    if (!PAYMENT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${PAYMENT_STATUSES.join(", ")}` }, { status: 400 });

    if (body.amount < 0) return NextResponse.json({ error: "amount must be >= 0" }, { status: 400 });

    if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
      const { data: booking } = await supabase.from("bookings").select("booking_id").eq("booking_id", body.booking_id).single();
      if (!booking) return NextResponse.json({ error: "booking_id does not exist" }, { status: 400 });
    }

    const { data, error } = await supabase.from("payments").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

```typescript
// ./app/api/profiles/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const ROLES = ["resident", "admin"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.role && !ROLES.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of ${ROLES.join(", ")}` }, { status: 400 });
    }

    const { data, error } = await supabase.from("user_profiles").update(body).eq("id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("user_profiles").delete().eq("id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/profiles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const ROLES = ["resident", "admin"];

export async function GET() {
  const { data, error } = await supabase.from("user_profiles").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Enum validation
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of ${ROLES.join(", ")}` }, { status: 400 });
    }

    // Prod FK check
    if (process.env.NEXT_PUBLIC_DEV_MODE !== "true") {
      const { data: user, error: fkError } = await supabase
        .from("auth.users")
        .select("id")
        .eq("id", body.id)
        .single();

      if (!user) return NextResponse.json({ error: "id does not exist in auth.users" }, { status: 400 });
      if (fkError) return NextResponse.json({ error: fkError.message }, { status: 500 });
    }

    const { data, error } = await supabase.from("user_profiles").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

```typescript
// ./app/api/slots/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const SLOT_TYPES = ["covered", "uncovered", "visitor"];
const SLOT_STATUSES = ["available", "maintenance", "reserved"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("parking_slots").select("*").eq("slot_id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.slot_type && !SLOT_TYPES.includes(body.slot_type))
      return NextResponse.json({ error: `Invalid slot_type. Must be one of ${SLOT_TYPES.join(", ")}` }, { status: 400 });

    if (body.status && !SLOT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${SLOT_STATUSES.join(", ")}` }, { status: 400 });

    const { data, error } = await supabase.from("parking_slots").update(body).eq("slot_id", params.id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("parking_slots").delete().eq("slot_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

```

```typescript
// ./app/api/slots/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const SLOT_TYPES = ["covered", "uncovered", "visitor"];
const SLOT_STATUSES = ["available", "maintenance", "reserved"];

export async function GET() {
  const { data, error } = await supabase.from("parking_slots").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
const body = await req.json();

    if (body.slot_type && !SLOT_TYPES.includes(body.slot_type))
      return NextResponse.json({ error: `Invalid slot_type. Must be one of ${SLOT_TYPES.join(", ")}` }, { status: 400 });

    if (body.status && !SLOT_STATUSES.includes(body.status))
      return NextResponse.json({ error: `Invalid status. Must be one of ${SLOT_STATUSES.join(", ")}` }, { status: 400 });

    const { data, error } = await supabase.from("parking_slots").insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

```typescript
// ./app/api/test/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok", route: "test" });
}

```

```typescript
// ./app/bookings/new/page.sonnet.tsx

// ===============================================================================
// app/bookings/new/page.tsx - Fixed standalone booking page
// ===============================================================================
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import BookingForm from '../../../components/BookingForm';
import BookingConfirmation from '../../../components/BookingConfirmation';
import AuthWrapper from '../../../components/AuthWrapper';

export default function NewBookingPage() {
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const router = useRouter();

  const handleBookingSuccess = (booking) => {
    setBookingConfirmed(booking);
  };

  const handleConfirmationDone = () => {
    setBookingConfirmed(null);
    // Navigate to bookings list
    router.push('/bookings');
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {!bookingConfirmed ? (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
                <p className="text-gray-600 mt-2">Select a time and available parking slot</p>
              </div>
              <BookingForm onSuccess={handleBookingSuccess} />
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed</h1>
              </div>
              <BookingConfirmation 
                booking={bookingConfirmed}
                onDone={handleConfirmationDone}
              />
            </div>
          )}
        </main>
      </div>
    </AuthWrapper>
  );
}
```

```typescript
// ./app/bookings/new/page.tsx

import Navigation from '@/components/common/Navigation';
import BookingForm from '@/components/booking/BookingForm';

export default function NewBookingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">New Booking</h1>
        {/* BookingForm exists in the project; if not, this will show placeholder text. */}
  <BookingForm onSuccess={() => { /* no-op placeholder */ }} />
      </main>
    </div>
  );
}

```

```typescript
// ./app/bookings/page.sonnet.tsx

// ===============================================================================
// app/bookings/page.tsx - Fixed bookings list page  
// ===============================================================================
"use client";

import Navigation from '@/components/common/Navigation';
import UserBookingsList from '../../components/UserBookingsList';
import AuthWrapper from '../../components/AuthWrapper';
import { useAuth } from '../../components/AuthWrapper';
import Link from 'next/link';

export default function BookingsPage() {
  const { profile, loading } = useAuth();

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
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
              <p className="text-gray-600 mt-2">Manage your parking reservations</p>
            </div>
            <Link 
              href="/bookings/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Booking
            </Link>
          </div>
          
          {profile ? (
            <UserBookingsList userId={profile.id} />
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600">Unable to load profile. Please refresh the page.</p>
            </div>
          )}
        </main>
      </div>
    </AuthWrapper>
  );
}
```

```typescript
// ./app/bookings/page.tsx

// app/bookings/page.tsx
import { supabase } from "@/lib/supabase";
import AuthWrapper from "@/components/auth/AuthWrapper";
import UserBookingsList from "@/components/booking/UserBookingsList";

export default async function BookingsPage() {
  // Get the currently logged-in user
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return (
      <div className="p-8 text-red-600 font-bold">
        ❌ Error fetching session
        <pre>{JSON.stringify(sessionError, null, 2)}</pre>
      </div>
    );
  }

  if (!session?.user) {
    return <AuthWrapper />; // redirect or show login if not signed in
  }

  const userId = session.user.id;

  // Fetch the user's bookings
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: true });

  if (error) {
    return (
      <div className="p-8 text-red-600 font-bold">
        ❌ Supabase Error
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  // Handler for cancelling a booking
  // TODO: refactor handleBooking and handleCancel later to use React state instead of window.location.reload() for smoother UX
  const handleCancel = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      alert("Error cancelling booking: " + error.message);
      return;
    }

    // Ideally, refetch bookings here; for now, simple page reload
    // handleCancel updates the booking’s status to "cancelled"; 
    // TODO: replace the window.location.reload() with a reactive state update 
    window.location.reload();
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      <UserBookingsList bookings={bookings} onCancel={handleCancel} />
    </main>
  );
}

```

```typescript
// ./app/dashboard/page.tsx

// app/dashboard/page.js – Entry point for resident dashboard

import AuthWrapper from "@/components/auth/AuthWrapper";
// import DevAuthWrapper from "@/components/auth/DevAuthWrapper";
import Navigation from "@/components/common/Navigation";
import UserDashboard from "@/components/UserDashboard";

export const metadata = {
  title: "Dashboard | ParkBoard",
  description: "View and manage your parking bookings",
};

export default function DashboardPage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1">
          <UserDashboard />
        </main>
      </div>
    </AuthWrapper>
  );
}

```

```css
// ./app/globals.css

/* app/globals.css - Working with Tailwind v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom CSS variables for your theme */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }

  * {
    border-color: hsl(var(--border));
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

```typescript
// ./app/layout.tsx

// =====================================================
// File: app/layout.tsx
// Updated with ErrorBoundary wrapper
// =====================================================
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata = {
  title: 'ParkBoard - Parking Management',
  description: 'Condo parking booking system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}

```

```typescript
// ./app/login/page.tsx

// app/login/page.tmp.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      router.replace("/dashboard");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Basic password confirmation check
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      setLoading(false);
      return;
    }

    // First, sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // Then create the user profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            name: name,
            unit_number: unitNumber,
            phone: phone || null,
            vehicle_plate: vehiclePlate || null,
          }
        ]);
        
      if (profileError) {
        console.error('Profile creation error:', profileError);
        setErrorMsg("Account created but profile setup failed. Please contact support.");
      } else {
        setSuccessMsg("Account created successfully! You can now sign in.");
        // Switch to login mode after successful signup
        setIsSignup(false);
        setPassword("");
        setConfirmPassword("");
        setName("");
        setUnitNumber("");
        setPhone("");
        setVehiclePlate("");
      }
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setErrorMsg("");
    setSuccessMsg("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setUnitNumber("");
    setPhone("");
    setVehiclePlate("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            {isSignup ? "Sign Up" : "Login"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {isSignup && (
              <>
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Unit Number"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  required
                />
                <Input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Vehicle Plate (optional)"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                />
              </>
            )}
            
            {errorMsg && (
              <p className="text-sm text-red-500">{errorMsg}</p>
            )}
            
            {successMsg && (
              <p className="text-sm text-green-600">{successMsg}</p>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? (isSignup ? "Creating account..." : "Signing in...") 
                : (isSignup ? "Sign Up" : "Sign In")
              }
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {isSignup 
                ? "Already have an account? Sign in" 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

```typescript
// ./app/page.tsx

// app/page.tsx - Updated home page with proper navigation
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <svg 
              className="w-16 h-16 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to ParkBoard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Smart parking management for modern communities. Book your spot, manage your schedule, and never worry about parking again.
          </p>
        </header>

        {/* Main CTA */}
        <div className="flex justify-center gap-4 mb-12">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/about"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Learn More
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Real-time Availability</h3>
            <p className="text-gray-600">
              Check parking slot availability in real-time and book instantly.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Easy Booking</h3>
            <p className="text-gray-600">
              Book, modify, or cancel your parking reservations with just a few clicks.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Admin Tools</h3>
            <p className="text-gray-600">
              Powerful admin dashboard for managing slots, users, and bookings.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Go to Dashboard
            </Link>
            <Link href="/bookings/new" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Book a Slot
            </Link>
            <Link href="/bookings" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              View My Bookings
            </Link>
            <Link href="/about" className="text-blue-600 hover:text-blue-800 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              About ParkBoard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

```typescript
// ./app/slots/page.sonnet.tsx

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
```

```typescript
// ./components/admin/AdminDashboard.tsx

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
```

```typescript
// ./components/auth/AuthWrapper.tsx

// components/AuthWrapper.tsx - Enhanced with session expiry handling
"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let sessionCheckInterval;

    const init = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setSessionError(error.message);
        }

        setUser(session?.user || null);
        setLoading(false);

        // Set up periodic session checks every 5 minutes
        if (session) {
          sessionCheckInterval = setInterval(async () => {
            const { data: { session: currentSession }, error: refreshError } = 
              await supabase.auth.getSession();
            
            if (!currentSession || refreshError) {
              console.log("Session expired or error, redirecting to login");
              await supabase.auth.signOut();
              router.replace("/login");
            }
          }, 5 * 60 * 1000); // 5 minutes
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setSessionError("Authentication initialization failed");
        setLoading(false);
      }
    };
    
    init();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (!session) {
          setUser(null);
          setProfile(null);
          router.replace("/login");
        }
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setUser(session?.user || null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setProfileLoading(true);
        try {
          const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Profile fetch error:", error);
            // If profile doesn't exist, redirect to profile setup
            if (error.code === 'PGRST116') {
              console.log("Profile not found, consider redirecting to profile setup");
              // You could redirect to a profile setup page here
              // router.push('/profile/setup');
            }
            setProfile(null);
          } else {
            setProfile(data);
          }
        } catch (err) {
          console.error("Profile fetch exception:", err);
          setProfile(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
        if (!loading) {
          router.replace("/login");
        }
      }
    };
    
    fetchProfile();
  }, [user, router, loading]);

  // Add a function to manually refresh session
  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error("Failed to refresh session:", error);
      await supabase.auth.signOut();
      router.replace("/login");
      return null;
    }
  };

  const value = { 
    user, 
    profile, 
    loading: loading || profileLoading,
    sessionError,
    refreshSession
  };

  // Show error state if there's a session error
  if (sessionError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Session Error</h2>
          <p className="text-red-600 mb-4">{sessionError}</p>
          <button
            onClick={() => {
              setSessionError(null);
              window.location.href = '/login';
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Don't redirect if we're still loading the initial auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading is complete, don't render children
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Redirecting to login...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {profileLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading profile...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
```

```typescript
// ./components/auth/DevAuthWrapper.tsx

// =============================================================================
// DevAuthWrapper.js - bypass auth for local dev/testing
// =============================================================================
"use client";

import { createContext, useContext } from "react";

const AuthContext = createContext({
  user: { id: "11111111-1111-1111-1111-111111111111" },
  profile: {
    id: "11111111-1111-1111-1111-111111111111",
    role: "resident",
    name: "Alice Resident"
  },
  loading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function DevAuthWrapper({ children }) {
  return <AuthContext.Provider value={useAuth()}>{children}</AuthContext.Provider>;
}

```

```typescript
// ./components/booking/BookingCard.tsx

// =============================================================================
// BookingCard.js - Individual booking display component
// =============================================================================

function BookingCard({ booking, onCancel }) {
  const now = new Date();
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const isActive = booking.status === 'confirmed' && endTime > now;
  const isPast = endTime <= now;

  const getStatusColor = () => {
    switch (booking.status) {
      case 'confirmed': return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">
            Slot {booking.parking_slots?.slot_number}
          </h3>
          <p className="text-sm text-gray-500 capitalize">
            {booking.parking_slots?.slot_type}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor()}`}>
          {booking.status}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        <div className="font-medium">
          {startTime.toLocaleDateString()}
        </div>
        <div>
          {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}
        </div>
      </div>

      {booking.parking_slots?.description && (
        <p className="text-sm text-gray-500">
          {booking.parking_slots.description}
        </p>
      )}

      {booking.notes && (
        <div className="text-sm">
          <span className="font-medium text-gray-700">Notes: </span>
          <span className="text-gray-600">{booking.notes}</span>
        </div>
      )}

      {isActive && booking.status === 'confirmed' && (
        <button
          onClick={() => onCancel(booking.booking_id)}
          className="w-full mt-3 px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
        >
          Cancel Booking
        </button>
      )}
    </div>
  );
}


```

```typescript
// ./components/booking/BookingConfirmation.tsx

// =============================================================================
// components/BookingConfirmation.tsx - Success state after booking
// =============================================================================

export default function BookingConfirmation({ booking, onDone, refreshBookings }) {
  if (!booking) return null;

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const slotNumber = booking.parking_slots?.slot_number ?? booking.slot_number ?? booking.slot_id;
  const slotType = booking.parking_slots?.slot_type ?? booking.slot_type ?? 'slot';

  return (
    <div role="status" aria-live="polite" className="max-w-md mx-auto">
      <div className="flex flex-col items-center bg-white border rounded-xl p-6 shadow-sm">
        <div className="bg-green-50 p-4 rounded-full mb-3">
          {/* Big checkmark */}
          <svg className="h-12 w-12 text-green-700" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
            <path d="M7 12.5l2.5 2.5L17 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-green-800">Booking Confirmed</h2>
        <p className="text-sm text-gray-600 mt-2">Your parking slot has been reserved.</p>

        <div className="w-full mt-4 text-left">
          <div className="text-sm text-gray-500">Slot</div>
          <div className="font-medium text-gray-800">{slotNumber} <span className="text-sm text-gray-500">({slotType})</span></div>

          <div className="mt-3 text-sm text-gray-500">When</div>
          <div className="text-gray-800">
            {startTime.toLocaleString()} – {endTime.toLocaleString()}
          </div>
        </div>

        <div className="w-full mt-6">
          <button
            onClick={() => {
              refreshBookings?.();
              onDone();
            }}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}


```

```typescript
// ./components/booking/BookingForm.tsx

// =====================================================
// File: components/booking/BookingForm.tsx
// Updated with consistent error handling
// Updated with booking rules validation
// =====================================================
"use client";

import { useState } from 'react';
import TimeRangePicker from './TimeRangePicker';
import SlotGrid from './SlotGrid';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import { BOOKING_RULES } from '@/lib/constants';
import ErrorDisplay, { SuccessMessage } from '@/components/common/ErrorDisplay';

export default function BookingForm({ onSuccess }: { onSuccess: (booking: any) => void }) {
  const { profile, user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState({ start: '', end: '' });
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateBooking = () => {
    if (!selectedSlot) {
      setError('Please select a parking slot.');
      return false;
    }
    
    if (!selectedTimeRange.start || !selectedTimeRange.end) {
      setError('Please select both start and end times.');
      return false;
    }

    const start = new Date(selectedTimeRange.start);
    const end = new Date(selectedTimeRange.end);
    const now = new Date();
    
    // Check duration limits
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (durationHours < BOOKING_RULES.MIN_DURATION_HOURS) {
      setError(`Minimum booking duration is ${BOOKING_RULES.MIN_DURATION_HOURS} hour(s)`);
      return false;
    }
    
    if (durationHours > BOOKING_RULES.MAX_DURATION_HOURS) {
      setError(`Maximum booking duration is ${BOOKING_RULES.MAX_DURATION_HOURS} hours`);
      return false;
    }
    
    // Check advance booking limit
    const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysInAdvance > BOOKING_RULES.MAX_ADVANCE_DAYS) {
      setError(`Cannot book more than ${BOOKING_RULES.MAX_ADVANCE_DAYS} days in advance`);
      return false;
    }
    
    return true;
  };

  const handleBooking = async () => {
    setError('');
    setSuccess('');

    if (!validateBooking()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: profile?.id,
          slot_id: selectedSlot.slot_id,
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          status: 'confirmed',
          notes: '',
        }),
      });

      if (!res.ok) {
        let errorMessage = 'Booking failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Booking failed: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();

      const bookingResult =
        result && result.parking_slots
          ? result
          : {
              ...result,
              parking_slots: {
                slot_number: selectedSlot.slot_number,
                slot_type: selectedSlot.slot_type,
              },
            };

      setSuccess('Booking successful! Redirecting...');
      
      setSelectedSlot(null);
      setSelectedTimeRange({ start: '', end: '' });
      
      setTimeout(() => {
        onSuccess(bookingResult);
      }, 1500);

    } catch (err: any) {
      console.error('Booking error:', err);
      
      if (err.message.includes('fetch failed') || err.message.includes('TypeError')) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else if (err.message.includes('already booked')) {
        setError('This slot is already booked for the selected time. Please choose a different slot or time.');
      } else if (err.message.includes('reserved for another')) {
        setError('This slot is reserved for another resident. Please select a different slot.');
      } else if (err.message.includes('500')) {
        setError('Server error occurred. Please try again in a moment.');
      } else if (err.message.includes('past')) {
        setError('Cannot book slots in the past. Please select a future time.');
      } else {
        setError(err?.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError('');
  const clearSuccess = () => setSuccess('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Book a Parking Slot</h2>
        
        <ErrorDisplay error={error} onRetry={clearError} className="mb-4" />
        <SuccessMessage message={success} onDismiss={clearSuccess} className="mb-4" />
        
        <TimeRangePicker value={selectedTimeRange} onChange={setSelectedTimeRange} />
      </div>

      {selectedTimeRange.start && selectedTimeRange.end && (
        <SlotGrid
          selectedDate={selectedTimeRange.start?.slice(0, 10)}
          selectedTimeRange={selectedTimeRange}
          onSlotSelect={setSelectedSlot}
        />
      )}

      {selectedSlot && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800">Selected Slot</h3>
          <p className="text-blue-700">
            {selectedSlot.slot_number} ({selectedSlot.slot_type})
          </p>
          <p className="text-sm text-blue-600 mt-2">
            {new Date(selectedTimeRange.start).toLocaleString()} - {' '}
            {new Date(selectedTimeRange.end).toLocaleString()}
          </p>
          
          <button
            className="mt-4 inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={handleBooking}
            disabled={loading || !selectedSlot || !selectedTimeRange.start || !selectedTimeRange.end}
            aria-busy={loading}
            aria-disabled={loading || !selectedSlot}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            )}
            {loading ? 'Saving booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  );
}
```

```typescript
// ./components/booking/SlotGrid.tsx

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


```

```typescript
// ./components/booking/TimeRangePicker.tsx

// components/TimeRangePicker.tsx - Select start/end times for booking
"use client";

import { useEffect, useState } from 'react';

export default function TimeRangePicker({ value, onChange }) {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('4'); // hours
  const [error, setError] = useState('');

  // Helper: calculate ISO start/end times and call onChange
  const updateTimeRange = (date, time, dur) => {
    if (!date || !time) return;

    try {
      const start = new Date(`${date}T${time}`);
      const end = new Date(start.getTime() + parseFloat(dur) * 60 * 60 * 1000);

      const now = new Date();
      if (start <= now) throw new Error('Start time must be in the future');
      if (end <= start) throw new Error('End time must be after start time');

      setError('');
      onChange({
        start: start.toISOString(),
        end: end.toISOString(),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Update parent whenever any input changes
  useEffect(() => {
    updateTimeRange(startDate, startTime, duration);
  }, [startDate, startTime, duration]);

  // Default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
  }, []);

  return (
    <div className="max-w-md space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Start Time</label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Duration</label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="1">1 hour</option>
          <option value="2">2 hours</option>
          <option value="4">4 hours</option>
          <option value="8">8 hours</option>
          <option value="12">12 hours</option>
          <option value="24">24 hours</option>
        </select>
      </div>
    </div>
  );
}

```

```typescript
// ./components/booking/UserBookingsList.tsx

// components/UserBookingsList.tsx - Enhanced with booking history
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getSlotIcon } from "@/lib/getSlotIcon";

export default function UserBookingsList({ userId }: { userId: string }) {
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch all bookings
      const { data, error } = await supabase
        .from("bookings")
        .select("*, parking_slots(slot_number, slot_type)")
        .eq("user_id", userId)
        .order("start_time", { ascending: false });

      if (error) throw error;
      
      const now = new Date();
      const active = [];
      const past = [];
      
      for (const booking of data || []) {
        if (booking.status === 'cancelled' || 
            booking.status === 'completed' || 
            new Date(booking.end_time) < now) {
          past.push(booking);
        } else if (booking.status === 'confirmed') {
          active.push(booking);
        }
      }
      
      setActiveBookings(active);
      setPastBookings(past);
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [userId]);

  const cancelBooking = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      const booking = activeBookings.find((b) => b.booking_id === bookingId);
      if (!booking) throw new Error("Booking not found");

      const now = new Date();
      const bookingStart = new Date(booking.start_time);
      const graceHours = 1;
      const cutoffTime = new Date(now.getTime() - graceHours * 60 * 60 * 1000);

      if (bookingStart < cutoffTime) {
        throw new Error(
          `Cannot cancel bookings that started more than ${graceHours} hour(s) ago.`
        );
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("booking_id", bookingId)
        .select();

      if (error) throw new Error(error.message || "Database update failed");
      if (!data || data.length === 0)
        throw new Error("No booking found with that ID or update failed");

      await fetchBookings(); // Refresh both lists
    } catch (err: any) {
      alert("Failed to cancel booking: " + (err.message || String(err)));
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-red-800 font-semibold mb-2">
            Failed to load bookings
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchBookings()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const bookingsToShow = viewMode === 'active' ? activeBookings : pastBookings;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'active' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active ({activeBookings.length})
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'history' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            History ({pastBookings.length})
          </button>
        </div>
        <button
          onClick={() => fetchBookings()}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {bookingsToShow.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {viewMode === 'active' ? 'No Active Bookings' : 'No Booking History'}
          </h3>
          <p className="text-gray-500">
            {viewMode === 'active' 
              ? 'Your confirmed bookings will appear here' 
              : 'Your past bookings will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookingsToShow.map((booking) => {
            const slotType = booking.parking_slots?.slot_type || "standard";
            const slotBgClass =
              slotType.toLowerCase() === "visitor"
                ? "bg-purple-100"
                : slotType.toLowerCase() === "covered"
                ? "bg-blue-100"
                : "bg-green-100";

            const statusColor = 
              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              booking.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              booking.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800';

            return (
              <div
                key={booking.booking_id}
                className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
                  viewMode === 'history' ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div
                        className={`${slotBgClass} p-2 rounded-lg mr-3 flex-shrink-0`}
                      >
                        {getSlotIcon(slotType)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Slot{" "}
                          {booking.parking_slots?.slot_number || booking.slot_id}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {slotType} parking space
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3a2 2 0 012-2h2a2 2 0 012 2v4m-6 0h6m-6 0V6a2 2 0 012-2h2a2 2 0 012 2v1m-6 0v11a2 2 0 002 2h2a2 2 0 002-2V7"
                            />
                          </svg>
                          <span className="font-medium text-gray-700">
                            {new Date(
                              booking.start_time
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-gray-700">
                            {new Date(
                              booking.start_time
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {new Date(booking.end_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Notes:{" "}
                        </span>
                        <span className="text-sm text-gray-600">
                          {booking.notes}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded-full ${statusColor}`}>
                        {booking.status}
                      </span>
                      <span className="mx-2">•</span>
                      <span>Booking #{booking.booking_id}</span>
                    </div>
                  </div>

                  {viewMode === 'active' && booking.status === 'confirmed' && (
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => cancelBooking(booking.booking_id)}
                        disabled={cancelling === booking.booking_id}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelling === booking.booking_id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent mr-2"></div>
                            <span className="hidden sm:inline">Cancelling...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="hidden sm:inline">Cancel</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

```typescript
// ./components/common/ErrorDisplay.tsx

// components/ErrorDisplay.tsx
// Reusable error display component
"use client";

interface ErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorDisplay({ error, onRetry, className = "" }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <svg 
          className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
        <div className="flex-1">
          <strong className="text-red-800">Error:</strong>
          <p className="text-red-700 mt-1">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Success message component as a bonus
interface SuccessMessageProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessMessage({ message, onDismiss, className = "" }: SuccessMessageProps) {
  if (!message) return null;

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <svg 
          className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <div className="flex-1">
          <p className="text-green-800">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
```

```typescript
// ./components/common/Navigation.tsx

// components/Navigation.tsx - Fixed encoding issue
"use client";

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthWrapper';
import { useState } from 'react';
import { supabase } from "@/lib/supabase";

export default function Navigation() {
  const { profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <svg 
                className="w-8 h-8 text-blue-600 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-bold text-xl text-gray-900">ParkBoard</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link 
              href="/dashboard" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              Dashboard
            </Link>
            <Link 
              href="/bookings/new" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              Book Slot
            </Link>
            <Link 
              href="/bookings" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              My Bookings
            </Link>
            {profile?.role === 'admin' && (
              <>
                <Link 
                  href="/admin" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                >
                  Admin
                </Link>
                <Link 
                  href="/admin/slots" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Manage Slots
                </Link>
                <Link 
                  href="/admin/users" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Manage Users
                </Link>
              </>
            )}
            <div className="ml-4 flex items-center space-x-4">
              {profile && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{profile.name}</span>
                  <span className="ml-1 text-gray-400">• Unit {profile.unit_number}</span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {menuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-b border-gray-200">
            {profile && (
              <div className="px-3 py-2 text-sm text-gray-600 border-b border-gray-100 mb-2">
                <div className="font-medium">{profile.name}</div>
                <div className="text-gray-400">Unit {profile.unit_number}</div>
              </div>
            )}
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/bookings/new"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              Book a Slot
            </Link>
            <Link
              href="/bookings"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              My Bookings
            </Link>
            {profile?.role === 'admin' && (
              <>
                <Link
                  href="/admin"
                  className="block px-3 py-2 rounded-md text-base font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Admin Dashboard
                </Link>
                <Link
                  href="/admin/slots"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Manage Slots
                </Link>
                <Link
                  href="/admin/users"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Manage Users
                </Link>
              </>
            )}
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
```

```typescript
// ./components/dashboard/MySlots.tsx

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


```

```typescript
// ./components/ErrorBoundary.tsx

// =====================================================
// File: components/ErrorBoundary.tsx
// React Error Boundary for crash protection
// =====================================================
"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    // You could send error to logging service here
    // Example: logErrorToService(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h2>
            
            <p className="text-gray-600 text-center mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


```

```typescript
// ./components/ui/alert.tsx

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }

```

```typescript
// ./components/ui/badge.tsx

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

```

```typescript
// ./components/ui/button.tsx

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

```typescript
// ./components/ui/card.tsx

import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```

```typescript
// ./components/ui/input.tsx

import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

```

```typescript
// ./components/ui/tabs.tsx

"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

```

```typescript
// ./components/UserDashboard.tsx

// =====================================================
// File: components/UserDashboard.tsx
// Main resident view with bookings and new booking flow
// Updated with MySlots component
// =====================================================
"use client";

import { useState, useRef } from 'react';
import UserBookingsList from '@/components/booking/UserBookingsList';
import BookingForm from '@/components/booking/BookingForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import MySlots from '@/components/dashboard/MySlots';
import { useAuth } from '@/components/auth/AuthWrapper';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 mb-2">No profile found</p>
          <p className="text-sm text-gray-600">Please contact support if this issue persists.</p>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setBookingConfirmed(null);
  };

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Welcome back, {profile.name}!
        </h1>
        <p className="text-gray-600">Unit {profile.unit_number}</p>
      </div>

      {/* Show owned slots if user has any */}
      <MySlots />

      {/* Tab navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'bookings' 
              ? 'border-blue-600 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('bookings')}
        >
          My Bookings
        </button>
        <button
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'new' 
              ? 'border-blue-600 text-blue-600 bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => handleTabChange('new')}
        >
          New Booking
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'bookings' && (
          <UserBookingsList userId={profile.id || ''} key={refreshKey} />
        )}

        {activeTab === 'new' && !bookingConfirmed && (
          <BookingForm
            onSuccess={setBookingConfirmed}
          />
        )}

        {bookingConfirmed && (
          <BookingConfirmation
            booking={bookingConfirmed}
            onDone={() => {
              setBookingConfirmed(null);
              setActiveTab('bookings');
            }}
            refreshBookings={triggerRefresh}
          />
        )}
      </div>
    </div>
  );
}
```

```typescript
// ./lib/constants.ts

// =====================================================
// File: lib/constants.ts
// Centralized booking rules and constants
// =====================================================
export const BOOKING_RULES = {
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 24,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_GRACE_HOURS: 1,
} as const;

export const SLOT_TYPES = {
  COVERED: 'covered',
  UNCOVERED: 'uncovered', 
  VISITOR: 'visitor',
} as const;

export const BOOKING_STATUSES = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;

export const USER_ROLES = {
  RESIDENT: 'resident',
  ADMIN: 'admin',
} as const;
```

```typescript
// ./lib/getSlotIcon.tsx

// lib/getSlotIcon.tsx
export const getSlotIcon = (slotType: string) => {
  switch (slotType?.toLowerCase()) {
    case 'covered':
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case 'visitor':
      return (
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
  }
};

```

```typescript
// ./lib/supabaseServer.ts

// lib/supabaseServer.ts
import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    // NEW v0.7+ cookie API
    cookieOptions: {
      get: (name: string) => nextCookies().get(name)?.value ?? null,
      set: (name: string, value: string) => nextCookies().set(name, value),
      remove: (name: string) => nextCookies().delete(name),
    },
  });
}

```

```typescript
// ./lib/supabase.ts

// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

```

```typescript
// ./lib/utils.ts

// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## CSS and Styling Files

```css
/* ./app/globals.css */

/* app/globals.css - Working with Tailwind v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom CSS variables for your theme */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }

  * {
    border-color: hsl(var(--border));
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

## Safe Configuration Files

```javascript
// tailwind.config.js

// tailwind.config.js - Updated for Tailwind v4
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

```javascript
// postcss.config.js

// =====================================================
// File: postcss.config.js
// Required for Tailwind CSS to work properly
// =====================================================
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

```json
// tsconfig.json

{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "esModuleInterop": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "strictNullChecks": true,
    
    // <-- Add these
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}

```

```json
// components.json

{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

## Environment Configuration Template

```bash
// .env structure (keys redacted)

NEXT_PUBLIC_SUPABASE_URL=***REDACTED***
NEXT_PUBLIC_SUPABASE_ANON_KEY=***REDACTED***
SUPABASE_SERVICE_ROLE_KEY=***REDACTED***
NEXT_PUBLIC_DEV_MODE=***REDACTED***

```

## Essential Documentation

```markdown
// README.md

# 🚗 ParkBoard - Condo Parking Management System

A modern, responsive parking slot booking system for residential condominiums. Built with Next.js 15, Supabase, and TypeScript.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Status](#project-status)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [Testing](#testing)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## ✨ Features

### Core MVP Features (✅ Implemented)
- **User Authentication**: Secure login/signup with Supabase Auth
- **Profile Management**: Automatic profile creation on signup
- **Slot Booking**: Real-time availability checking with conflict prevention
- **Booking Management**: View, cancel, and track booking history
- **Slot Ownership**: Support for deeded/assigned slots and shared/visitor slots
- **Admin Dashboard**: Comprehensive oversight of users, slots, and bookings
- **Mobile Responsive**: Works seamlessly on all devices
- **Error Handling**: Graceful error recovery with user-friendly messages

### Business Rules
- Minimum booking duration: 1 hour
- Maximum booking duration: 24 hours
- Maximum advance booking: 30 days
- Cancellation grace period: 1 hour
- Slot types: Covered, Uncovered, Visitor
- Mixed ownership model: Owned slots + shared slots

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React 18
- **Styling**: Tailwind CSS v3, shadcn/ui components
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (recommended)
- **State Management**: React hooks + Context API

## 📊 Project Status

### Current Version: MVP 1.1
- ✅ Core booking functionality complete
- ✅ Slot ownership system integrated
- ✅ Admin management tools active
- ✅ Production-ready with RLS policies
- ✅ Comprehensive error handling

### Next Phase (v1.2)
- [ ] Email notifications
- [ ] Payment integration (GCash, bank transfer)
- [ ] Recurring bookings
- [ ] Advanced reporting
- [ ] Mobile app

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/parkboard.git
cd parkboard
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. **Run development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

## 💾 Database Setup

### 1. Create Tables
Run these SQL scripts in order in your Supabase SQL Editor:

```sql
-- 1. Run schema.sql
-- 2. Run rls_policies.sql  
-- 3. Run migrations/add_slot_ownership.sql
-- 4. Run seed_data.sql (for testing)
```

### 2. Enable Row Level Security
All tables have RLS enabled with appropriate policies for:
- Users can only see/edit their own data
- Admins have broader access
- Slot ownership is enforced

### 3. Create Initial Admin
```sql
-- After creating a user through the app, promote to admin:
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@yourcompany.com';
```

## 🧪 Testing

### Quick Test Checklist
Run through `merged_qa_checklist.md` for comprehensive testing:

1. **Authentication Flow**
   - Sign up with email/password
   - Profile auto-creation
   - Login/logout functionality

2. **Booking Flow** 
   - Select time range
   - Choose available slot
   - Confirm booking
   - View in My Bookings
   - Cancel if needed

3. **Ownership Validation**
   - Owned slots appear with "Your Slot" badge
   - Can book owned slots anytime available
   - Cannot book slots owned by others
   - Can book shared/visitor slots

4. **Admin Functions**
   - View all bookings
   - Manage slots (add/edit/delete)
   - Assign slot ownership
   - Change user roles

### Test Data
Use the provided seed data for testing:
- 3 test users (resident, owner, admin)
- 10 parking slots (mixed types)
- Sample bookings

## 🏗 Architecture

### Directory Structure
```
parkboard/
├── app/                  # Next.js App Router
│   ├── api/             # API routes
│   ├── admin/           # Admin pages
│   ├── bookings/        # Booking pages
│   └── dashboard/       # User dashboard
├── components/          # React components
│   ├── auth/           # Authentication
│   ├── booking/        # Booking components
│   ├── common/         # Shared components
│   └── ui/             # shadcn/ui components
├── lib/                # Utilities
│   ├── supabase.ts     # Supabase client
│   └── constants.ts    # App constants
└── db/                 # Database scripts
    ├── schema.sql      # Table definitions
    ├── rls_policies.sql # Security policies
    └── migrations/     # Schema updates
```

### Database Schema
```
user_profiles (extends auth.users)
├── id (uuid, FK to auth.users)
├── name, unit_number, email
├── role (resident/admin)
└── vehicle_plate, phone

parking_slots
├── slot_id (serial, PK)
├── slot_number (unique)
├── slot_type (covered/uncovered/visitor)
├── status (available/maintenance/reserved)
├── owner_id (FK to auth.users, nullable)
└── description

bookings
├── booking_id (serial, PK)
├── user_id (FK to auth.users)
├── slot_id (FK to parking_slots)
├── start_time, end_time (timestamptz)
├── status (confirmed/cancelled/completed)
└── notes
```

## 📡 API Documentation

### Endpoints

#### Bookings
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings` - Create new booking
- `PATCH /api/bookings/[id]` - Update booking
- `DELETE /api/bookings/[id]` - Cancel booking

#### Slots
- `GET /api/slots` - Get all slots
- `POST /api/slots` - Create slot (admin)
- `PATCH /api/slots/[id]` - Update slot (admin)
- `DELETE /api/slots/[id]` - Delete slot (admin)

#### Profiles
- `GET /api/profiles/[id]` - Get user profile
- `PATCH /api/profiles/[id]` - Update profile

### Request/Response Examples
```javascript
// Create booking
POST /api/bookings
{
  "user_id": "uuid",
  "slot_id": 1,
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T17:00:00Z"
}

// Response
{
  "booking_id": 123,
  "status": "confirmed",
  "parking_slots": {
    "slot_number": "A-001",
    "slot_type": "covered"
  }
}
```

## 🔧 Troubleshooting

### Common Issues

#### UI/Styling Issues
1. **Missing styles**: Ensure `globals.css` is imported in `app/layout.tsx`
2. **Tailwind not working**: Check `tailwind.config.js` and `postcss.config.js`
3. **Dynamic classes not rendering**: Use complete class names, not string concatenation

#### Database Issues  
1. **RLS errors**: Check user authentication and policies
2. **Foreign key violations**: Ensure referenced records exist
3. **Booking conflicts**: Database constraints prevent double-booking

#### Authentication Issues
1. **Profile not created**: Check service role key in environment
2. **Session expired**: Implement refresh token logic
3. **Role restrictions**: Verify user role in user_profiles table

### Debug Commands
```bash
# Check Supabase connection
curl http://localhost:3000/api/test

# View database logs
supabase db logs --tail

# Reset database (dev only)
supabase db reset
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting PR

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Developer**: Alfie PELICANO
- **Project**: Condo Parking Management System
- **Status**: Production Ready (MVP)
- **Support**: alfieprojects.dev@gmail.com

## 🙏 Acknowledgments

- Built with Next.js and Supabase
- UI components from shadcn/ui
- Icons from Lucide React
- Deployed on Vercel

---

**Last Updated**: 26 September 2024  
**Version**: 1.1.0  
**Build Status**: ✅ Passing
```

## Database Schema

```sql
-- ./db/schema.sql

-- =============================================================================
-- FILE 1: schema.sql (Main Schema Creation)
-- Run this in Supabase SQL Editor first
-- =============================================================================

-- Drop tables in reverse dependency order (for clean re-runs)
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS user_profiles;

-- =============================================================================
-- USER PROFILES TABLE
-- Note: Links to auth.users (Supabase managed auth)
-- =============================================================================
CREATE TABLE user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    email TEXT NOT NULL, -- mirror from auth.users for easy queries
    phone TEXT,
    vehicle_plate TEXT,
    role TEXT CHECK (role IN ('resident', 'admin')) DEFAULT 'resident',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PARKING SLOTS TABLE
-- =============================================================================
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered', 'visitor')) DEFAULT 'uncovered',
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available',
    description TEXT, -- e.g., "Near elevator", "Compact car only"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BOOKINGS TABLE
-- =============================================================================
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    slot_id INT NOT NULL REFERENCES parking_slots (slot_id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'confirmed',
    notes TEXT, -- user or admin notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business rule constraints
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT booking_not_in_past CHECK (start_time >= NOW() - INTERVAL '1 hour') -- allow 1hr grace period
);

-- =============================================================================
-- PAYMENTS TABLE (Optional for MVP)
-- =============================================================================
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings (booking_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT CHECK (payment_method IN ('cash', 'gcash', 'bank_transfer', 'free')),
    reference_number TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES for Performance
-- =============================================================================
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

```

```sql
-- ./db/rls_policies.sql

-- =============================================================================
-- FILE 2: rls_policies.sql (Row Level Security - MVP Safe, Revised for schema_v2)
-- Run this after schema_v2.sql
-- =============================================================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- user_profiles policies
-- ========================================================
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ========================================================
-- bookings policies
-- ========================================================
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'admin'
      )
  );

CREATE POLICY "Admins can update any booking"
  ON bookings FOR UPDATE
  USING (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'admin'
      )
  );

-- ========================================================
-- parking_slots policies (MVP safe)
-- ========================================================
-- Everyone (authenticated) can view slots
CREATE POLICY "Anyone logged in can view slots"
  ON parking_slots FOR SELECT
  USING (true);

-- Only admins can insert slots
CREATE POLICY "Admins can insert slots"
  ON parking_slots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Only admins can update slots
CREATE POLICY "Admins can update slots"
  ON parking_slots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Only admins can delete slots
CREATE POLICY "Admins can delete slots"
  ON parking_slots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

```

## Package Dependencies

```json
// package.json (essentials only)
{
  "name": "parkboard",
  "version": "1.1.0",
  "description": "ParkBoard is a minimal parking booking web app for a small, vetted condo community. It follows a hotel-booking pattern (users, parking slots, bookings) and is built as an MVP using Supabase + Next.js + Tailwind.",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/alfieprojectsdev/parkboard.git"
  },
  "keywords": ["parking", "booking", "condo", "management"],
  "author": "",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/alfieprojectsdev/parkboard/issues"
  },
  "homepage": "https://github.com/alfieprojectsdev/parkboard#readme",
  "dependencies": {
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@supabase/ssr": "^0.0.10",
    "@supabase/supabase-js": "^2.39.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.303.0",
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/react": "^14.0.0",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.16",
    "babel-jest": "^29.7.0",
    "jest": "^29.7.0",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

