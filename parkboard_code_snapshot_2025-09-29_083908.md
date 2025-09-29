# ParkBoard Project Code Snapshot
Generated on: Monday, 29 September, 2025 08:39:08 AM PST
Timestamp: 2025-09-29_083908
Repository State: Complete project snapshot excluding lengthy documentation

## Project Structure Overview
This snapshot includes:
- ✅ All TypeScript/JavaScript application code
- ✅ SQL database scripts (schema, migrations, seeds)
- ✅ Configuration files with redacted sensitive values
- ✅ Environment files with redacted API keys
- ✅ CSS/Styling files
- ✅ Essential package dependencies
- ❌ Build artifacts and node_modules
- ❌ Lengthy documentation files (*.md)
- ❌ Auto-generated files

---

## Core Application Code

```typescript
// app/about/page.tsx

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
// app/admin/AdminDashboardContent.tsx

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
// app/admin/page.tsx

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
// app/admin/slots/page.tsx

// =====================================================
// File: app/admin/slots/page.tsx
// Fixed - must be a Client Component with AuthWrapper
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

function AdminSlotsContent() {
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

export default function AdminSlotsPage() {
  return (
    <AuthWrapper>
      <AdminSlotsContent />
    </AuthWrapper>
  );
}

```

```typescript
// app/admin/users/page.tsx

// =====================================================
// File: app/admin/users/page.tsx
// Fixed - must be a Client Component with AuthWrapper
// =====================================================
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

function AdminUsersContent() {
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

export default function AdminUsersPage() {
  return (
    <AuthWrapper>
      <AdminUsersContent />
    </AuthWrapper>
  );
}
```

```typescript
// app/api/bookings/[id]/route.ts

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
// app/api/bookings/route.ts

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
// app/api/payments/[id]/route.ts

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
// app/api/payments/route.ts

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
// app/api/profiles/[id]/route.ts

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
// app/api/profiles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
// app/api/slots/[id]/route.ts

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
// app/api/slots/route.ts

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
// app/api/test/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok", route: "test" });
}

```

```typescript
// app/bookings/new/page.sonnet.tsx

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
// app/bookings/new/page.tsx

// =====================================================
// File: app/bookings/new/page.tsx
// Fixed - must be a Client Component
// =====================================================
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import BookingForm from '@/components/booking/BookingForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import AuthWrapper from '@/components/auth/AuthWrapper';

export default function NewBookingPage() {
  const [bookingConfirmed, setBookingConfirmed] = useState<any>(null);
  const router = useRouter();

  const handleBookingSuccess = (booking: any) => {
    setBookingConfirmed(booking);
  };

  const handleConfirmationDone = () => {
    setBookingConfirmed(null);
    router.push('/dashboard');
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
// app/bookings/page.sonnet.tsx

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
// app/bookings/page.tsx

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
// app/dashboard/page.tsx

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

```typescript
// app/fix-profile/page.tsx

// app/fix-profile/page.tsx - Fixed profile creation with duplicate handling
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FixProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    unit_number: "",
    phone: "",
    vehicle_plate: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!session?.user) {
          router.push('/login');
          return;
        }

        setUser(session.user);

        // Check if profile already exists
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          console.log('Profile already exists:', profile);
          setExistingProfile(profile);
          setFormData({
            name: profile.name || "",
            unit_number: profile.unit_number || "",
            phone: profile.phone || "",
            vehicle_plate: profile.vehicle_plate || "",
          });
        } else if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is expected for missing profile
          console.error('Error checking profile:', profileError);
          setError('Error checking existing profile: ' + profileError.message);
        }

      } catch (err) {
        console.error('Session error:', err);
        setError('Authentication error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const profileData = {
        id: user.id,
        email: user.email,
        name: formData.name.trim(),
        unit_number: formData.unit_number.trim(),
        phone: formData.phone.trim() || null,
        vehicle_plate: formData.vehicle_plate.trim() || null,
        role: 'resident',
        updated_at: new Date().toISOString()
      };

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', user.id);

        if (updateError) throw updateError;
        setSuccess("Profile updated successfully!");
      } else {
        // Create new profile using upsert to handle duplicates
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert(profileData, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (upsertError) throw upsertError;
        setSuccess("Profile created successfully!");
      }

      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err) {
      console.error('Profile operation error:', err);
      if (err.message.includes('duplicate key')) {
        setError('Profile already exists. Redirecting to dashboard...');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setError('Failed to save profile: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            {existingProfile ? "Update Profile" : "Complete Your Profile"}
          </CardTitle>
          {user && (
            <p className="text-center text-sm text-gray-600">
              {user.email}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Number *
              </label>
              <Input
                type="text"
                value={formData.unit_number}
                onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                placeholder="e.g., 101A, B-205"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="e.g., 09171234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Plate
              </label>
              <Input
                type="text"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})}
                placeholder="e.g., ABC-123"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting || !formData.name.trim() || !formData.unit_number.trim()}
            >
              {submitting 
                ? (existingProfile ? "Updating..." : "Creating...") 
                : (existingProfile ? "Update Profile" : "Create Profile")
              }
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Skip and go to Dashboard
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

```css
// app/globals.css

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
// app/layout.tsx

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
// app/login/page.tsx

// app/login/page.tsx - Enhanced with password reset and improved signup
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
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

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setName("");
    setUnitNumber("");
    setPhone("");
    setVehiclePlate("");
    clearMessages();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

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
    clearMessages();

    // Validation
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // Create auth user
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) throw signupError;

      // Create profile using service role to bypass RLS
      if (data.user) {
        const { error: profileError } = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: name.trim(),
            unit_number: unitNumber.trim(),
            phone: phone.trim() || null,
            vehicle_plate: vehiclePlate.trim() || null,
            role: 'resident'
          })
        }).then(res => res.ok ? null : res.json().then(data => ({ message: data.error })));

        if (profileError) {
          console.error('Profile creation error:', profileError);
          setErrorMsg("Account created but profile setup failed. Please contact support or use the 'Fix Profile' link.");
        } else {
          setSuccessMsg("Account created successfully! You can now sign in.");
          setMode('login');
          resetForm();
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setErrorMsg(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Password reset link sent to your email. Check your inbox!");
    }
    setLoading(false);
  };

  const switchMode = (newMode: 'login' | 'signup' | 'reset') => {
    setMode(newMode);
    resetForm();
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Sign Up';
      case 'reset': return 'Reset Password';
      default: return 'Login';
    }
  };

  const getSubmitText = () => {
    if (loading) {
      switch (mode) {
        case 'signup': return 'Creating account...';
        case 'reset': return 'Sending reset link...';
        default: return 'Signing in...';
      }
    }
    switch (mode) {
      case 'signup': return 'Sign Up';
      case 'reset': return 'Send Reset Link';
      default: return 'Sign In';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handlePasswordReset} 
            className="space-y-4"
          >
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            {mode !== 'reset' && (
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
            
            {mode === 'signup' && (
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}
            
            {successMsg && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{successMsg}</p>
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {getSubmitText()}
            </Button>
          </form>
          
          <div className="mt-4 space-y-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-blue-600 hover:text-blue-800 underline block w-full"
                >
                  Don't have an account? Sign up
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-gray-600 hover:text-gray-800 underline block w-full"
                >
                  Forgot your password?
                </button>
              </>
            )}
            
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 underline block w-full"
              >
                Already have an account? Sign in
              </button>
            )}
            
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 underline block w-full"
              >
                Back to login
              </button>
            )}
          </div>

          {/* Emergency profile fix link */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <a
              href="/fix-profile"
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Having profile issues? Fix Profile
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

```typescript
// app/page.tsx

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
// app/reset-password/page.tsx

// app/reset-password/page.tsx - Complete password reset flow
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Handle the auth callback with the token
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    handleAuthCallback();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-center text-xl">Set New Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <Input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating password..." : "Update Password"}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Back to login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}screen bg-gray-50">
        <Card className="w-full max-w-md shadow-lg rounded-2xl">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Updated!</h2>
            <p className="text-gray-600 mb-4">Your password has been successfully updated.</p>
            <p className="text-sm text-gray-500">Redirecting to login in 3 seconds...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">Set New Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <Input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating password..." : "Update Password"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Back to login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

```typescript
// app/slots/page.sonnet.tsx

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
// components/admin/AdminDashboard.tsx

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
// components/auth/AuthWrapper.tsx

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
            .eq("id", user.id)  // Make sure this matches exactly
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
// components/auth/DevAuthWrapper.tsx

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
// components/booking/BookingCard.tsx

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
// components/booking/BookingConfirmation.tsx

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
// components/booking/BookingForm.tsx

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
// components/booking/SlotGrid.tsx

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
// components/booking/TimeRangePicker.tsx

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
// components/booking/UserBookingsList.tsx

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
// components/common/ErrorDisplay.tsx

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
// components/common/Navigation.tsx

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
// components/dashboard/MySlots.tsx

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
// components/ErrorBoundary.tsx

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
// components/ui/alert.tsx

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
// components/ui/badge.tsx

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
// components/ui/button.tsx

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
// components/ui/card.tsx

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
// components/ui/input.tsx

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
// components/ui/tabs.tsx

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
// components/UserDashboard.tsx

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
// lib/constants.ts

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
// lib/getSlotIcon.tsx

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
// lib/supabaseServer.ts

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
// lib/supabase.ts

// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

```

```typescript
// lib/utils.ts

// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```typescript
// src/lib/supabase.js

// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


```


## Database Scripts and Migrations

```sql
-- db/complete_db_reset.sql

-- =============================================================================
-- COMPLETE DATABASE RESET SCRIPT
-- Run this in Supabase SQL Editor to wipe everything clean
-- WARNING: This will delete ALL users and data - use only in development!
-- =============================================================================

-- Step 1: Drop all your application tables first (to avoid FK constraint issues)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Step 2: Drop all RLS policies (they reference tables that will be recreated)
-- Note: If tables are dropped, policies are automatically dropped too, but being explicit

-- Step 3: Clear auth.users (THIS IS THE KEY PART)
-- This will delete all authenticated users
DELETE FROM auth.users;

-- Step 4: Clear any auth-related tables that might have references
-- These are Supabase internal tables - clear them too
DELETE FROM auth.identities;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;

-- Step 5: Reset sequences (so IDs start from 1 again)
-- Note: These will be recreated when you run the new schema
-- but if you want to be thorough:
DROP SEQUENCE IF EXISTS parking_slots_slot_id_seq CASCADE;
DROP SEQUENCE IF EXISTS bookings_booking_id_seq CASCADE;
DROP SEQUENCE IF EXISTS payments_payment_id_seq CASCADE;

-- Step 6: Verify everything is clean
-- These should return 0 rows:
SELECT COUNT(*) as auth_users_count FROM auth.users;
SELECT COUNT(*) as identities_count FROM auth.identities;

-- =============================================================================
-- Now you can run schema_v3_unified.sql with a completely clean slate!
-- =============================================================================
```

```sql
-- db/corrected_reset_script.sql

-- =============================================================================
-- COMPLETE DATABASE RESET - Run this FIRST (Corrected)
-- =============================================================================

-- Drop application tables (if they exist)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Clear auth tables
DELETE FROM auth.users;
DELETE FROM auth.identities;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;

-- Reset sequences (if they exist)
DROP SEQUENCE IF EXISTS parking_slots_slot_id_seq CASCADE;
DROP SEQUENCE IF EXISTS bookings_booking_id_seq CASCADE;
DROP SEQUENCE IF EXISTS payments_payment_id_seq CASCADE;

-- Verify clean slate (only check tables that should still exist)
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- Check that application tables are gone
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') 
    THEN 'user_profiles table still exists' 
    ELSE 'user_profiles table successfully dropped' 
  END as status;
```

```sql
-- db/deprecated/development_v1.sql

-- =============================================================================
-- Development Seed Data
-- Extracted from wipe_and_seed_testing.sql
-- =============================================================================

-- Clear existing data
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- Test user profiles (using fake UUIDs for development)
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
('11111111-1111-1111-1111-111111111111', 'Alice Resident', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Resident', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'HOA', 'carol@example.com', '09170001122', 'ADMIN-01', 'admin');

-- Sample parking slots
INSERT INTO parking_slots (slot_number, slot_type, status, description)
VALUES
('A-001', 'covered', 'available', 'Near main entrance'),
('A-002', 'covered', 'available', 'Near elevator'),
('A-003', 'covered', 'maintenance', 'Under repair'),
('B-001', 'uncovered', 'available', 'Good for SUV'),
('B-002', 'uncovered', 'available', 'Compact cars preferred'),
('B-003', 'uncovered', 'available', 'Standard size'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking');

-- Sample bookings (future dates)
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'confirmed', 'Test booking for Alice'),
('22222222-2222-2222-2222-222222222222', 2, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '6 hours', 'confirmed', 'Test booking for Bob');

-- Sample payments
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
VALUES
(1, 100.00, 'cash', 'completed', 'CASH001'),
(2, 150.00, 'gcash', 'pending', 'GC002');

```

```sql
-- db/deprecated/production_v1.sql

-- =============================================================================
-- Production Seed Data
-- Minimal data for production deployment
-- =============================================================================

-- Add initial parking slots (customize for your building)
INSERT INTO parking_slots (slot_number, slot_type, status, description)
VALUES
('P-001', 'covered', 'available', 'Premium covered slot'),
('P-002', 'covered', 'available', 'Premium covered slot'),
('P-003', 'covered', 'available', 'Premium covered slot'),
('U-001', 'uncovered', 'available', 'Standard uncovered slot'),
('U-002', 'uncovered', 'available', 'Standard uncovered slot'),
('U-003', 'uncovered', 'available', 'Standard uncovered slot'),
('U-004', 'uncovered', 'available', 'Standard uncovered slot'),
('U-005', 'uncovered', 'available', 'Standard uncovered slot'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking');

-- Note: User profiles will be created automatically via auth signup process
-- Note: No test bookings or payments in production

```

```sql
-- db/deprecated/schema_setup_templates.sql

-- =============================================================================
-- ParkBoard MVP Schema Setup for Supabase
-- Day 1: Database Setup Templates
-- =============================================================================

-- =============================================================================
-- FILE 1: schema_v2.sql (Main Schema Creation)
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

-- =============================================================================
-- FILE 2: rls_policies.sql (Row Level Security - MVP Safe)
-- Run this after schema_v2.sql
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- Note: parking_slots and payments can stay public for MVP

-- =============================================================================
-- User Profiles Policies
-- =============================================================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
    ON user_profiles FOR SELECT 
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
    ON user_profiles FOR UPDATE 
    USING (id = auth.uid());

-- Only service role can insert new profiles (admin managed onboarding)
CREATE POLICY "Service role can insert profiles" 
    ON user_profiles FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
    ON user_profiles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- =============================================================================
-- Bookings Policies
-- =============================================================================
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" 
    ON bookings FOR SELECT 
    USING (user_id = auth.uid());

-- Users can insert their own bookings
CREATE POLICY "Users can create own bookings" 
    ON bookings FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Users can update their own bookings (for cancellation)
CREATE POLICY "Users can update own bookings" 
    ON bookings FOR UPDATE 
    USING (user_id = auth.uid());

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings" 
    ON bookings FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- Admins can update any booking
CREATE POLICY "Admins can update any booking" 
    ON bookings FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin'
        )
    );

-- =============================================================================
-- FILE 3: seed_data.sql (Test Data for Development)
-- Run this after RLS policies
-- =============================================================================

-- =============================================================================
-- Parking Slots Seed Data
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, description) VALUES
('A-001', 'covered', 'available', 'Near main entrance'),
('A-002', 'covered', 'available', 'Near elevator'),
('A-003', 'covered', 'maintenance', 'Under repair'),
('B-001', 'uncovered', 'available', 'Good for SUV'),
('B-002', 'uncovered', 'available', 'Compact cars preferred'),
('B-003', 'uncovered', 'available', 'Standard size'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking');

-- =============================================================================
-- Sample User Profiles (Insert via Supabase Auth first, then update here)
-- NOTE: You'll need to create auth.users entries first via Supabase Auth UI
-- Then run these INSERTs with the actual UUIDs
-- =============================================================================
-- Example structure (replace with actual UUIDs after auth signup):
/*
INSERT INTO user_profiles (id, name, unit_number, email, role) VALUES
('UUID-FROM-AUTH-SIGNUP-1', 'Alice Santos', 'A-101', 'alice@example.com', 'resident'),
('UUID-FROM-AUTH-SIGNUP-2', 'Bob Reyes', 'B-202', 'bob@example.com', 'resident'),  
('UUID-FROM-AUTH-SIGNUP-3', 'Admin User', 'MGMT', 'admin@example.com', 'admin');
*/

-- =============================================================================
-- FILE 4: wipe_and_reset.sql (Development Reset Script)
-- Use this when you need to completely reset your dev database
-- =============================================================================

-- WARNING: This deletes all data. Use only in development!

-- Drop policies first
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;

-- Drop tables
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS user_profiles;

-- Now re-run schema_v2.sql and rls_policies.sql

-- =============================================================================
-- FILE 5: useful_queries.sql (Development Helper Queries)
-- =============================================================================

-- Check available slots for a time period
SELECT ps.slot_number, ps.slot_type, ps.status
FROM parking_slots ps
WHERE ps.status = 'available'
AND NOT EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.slot_id = ps.slot_id 
    AND b.status = 'confirmed'
    AND b.start_time < '2025-01-15 18:00:00'  -- replace with end time
    AND b.end_time > '2025-01-15 08:00:00'    -- replace with start time
);

-- Get user's current bookings
SELECT b.booking_id, ps.slot_number, b.start_time, b.end_time, b.status
FROM bookings b
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE b.user_id = 'USER-UUID-HERE'
AND b.status IN ('confirmed')
ORDER BY b.start_time;

-- Admin view: All bookings for today
SELECT 
    up.name, 
    up.unit_number,
    ps.slot_number, 
    b.start_time, 
    b.end_time, 
    b.status
FROM bookings b
JOIN user_profiles up ON b.user_id = up.id
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE DATE(b.start_time) = CURRENT_DATE
ORDER BY b.start_time;

-- Check for booking conflicts (useful for validation)
SELECT 
    b1.booking_id as booking1,
    b2.booking_id as booking2,
    b1.slot_id,
    b1.start_time, b1.end_time,
    b2.start_time, b2.end_time
FROM bookings b1
JOIN bookings b2 ON b1.slot_id = b2.slot_id 
WHERE b1.booking_id != b2.booking_id
AND b1.status = 'confirmed' 
AND b2.status = 'confirmed'
AND b1.start_time < b2.end_time 
AND b1.end_time > b2.start_time;
```

```sql
-- db/deprecated/schema_v1.sql

-- schema_v1.sql
-- ParkBoard MVP Database Schema (Hotel Booking Pattern)
-- Version 1 - Frozen for 30 days

-- Drop tables in reverse dependency order (for re-runs in dev)
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

-- ==============================
-- USERS TABLE
-- ==============================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    vehicle_plate TEXT,
    role TEXT CHECK (role IN ('resident', 'admin')) DEFAULT 'resident'
);

-- ==============================
-- PARKING SLOTS TABLE
-- ==============================
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    type TEXT CHECK (type IN ('covered', 'uncovered')) NOT NULL,
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available'
);

-- ==============================
-- BOOKINGS TABLE
-- ==============================
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    slot_id INT NOT NULL REFERENCES parking_slots(slot_id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'cancelled', 'completed')) DEFAULT 'confirmed'
);

-- ==============================
-- PAYMENTS TABLE (optional for MVP)
-- ==============================
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method TEXT CHECK (method IN ('cash', 'gcash', 'bank_transfer'))
);

-- ==============================
-- ADMINS TABLE (optional if not using role column in USERS)
-- ==============================
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    permissions TEXT
);

-- ==============================
-- SAMPLE DATA FOR DEV TESTING
-- ==============================

-- Users
INSERT INTO users (name, unit_number, email, phone, vehicle_plate, role)
VALUES
('Alice Santos', 'A-101', 'alice@example.com', '09170001111', 'ABC-1234', 'resident'),
('Bob Reyes', 'B-202', 'bob@example.com', '09170002222', 'XYZ-5678', 'resident'),
('Carlos Admin', 'C-303', 'admin@example.com', '09170003333', NULL, 'admin');

-- Parking Slots
INSERT INTO parking_slots (slot_number, type, status)
VALUES
('P1', 'covered', 'available'),
('P2', 'covered', 'available'),
('P3', 'uncovered', 'maintenance');

-- Bookings
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status)
VALUES
(1, 1, '2025-08-14 08:00:00', '2025-08-14 18:00:00', 'confirmed');

-- Payments (optional example)
INSERT INTO payments (booking_id, amount, method)
VALUES
(1, 200.00, 'gcash');

-- Admins (optional example)
INSERT INTO admins (user_id, permissions)
VALUES
(3, 'full_access');
```

```sql
-- db/deprecated/schema_v2.sql

-- =============================================================================
-- FILE 1: schema_v2.sql (Main Schema Creation)
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
-- db/deprecated/schema_v3.sql

-- =============================================================================
-- FILE: schema_v3_unified.sql (Unified Schema with Slot Ownership)
-- Run this in Supabase SQL Editor to replace both schema.sql + add_slot_ownership.sql
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
-- PARKING SLOTS TABLE (WITH OWNERSHIP SUPPORT)
-- =============================================================================
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered', 'visitor')) DEFAULT 'uncovered',
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available',
    owner_id uuid REFERENCES auth.users (id), -- NULL = shared/visitor slot
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
CREATE INDEX idx_parking_slots_owner ON parking_slots(owner_id); -- For ownership queries

-- =============================================================================
-- UPDATED RLS POLICIES (Ownership-aware)
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

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ========================================================
-- bookings policies (ownership-aware)
-- ========================================================
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (user_id = auth.uid());

-- Updated: Users can only book slots they own OR shared slots
CREATE POLICY "Users can book owned or shared slots"
  ON bookings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM parking_slots ps
      WHERE ps.slot_id = bookings.slot_id
        AND (ps.owner_id = auth.uid() OR ps.owner_id IS NULL)
    )
  );

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
-- parking_slots policies (ownership-aware)
-- ========================================================
-- Everyone can view all slots (with ownership info)
CREATE POLICY "Users can view all slots with ownership info"
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

```sql
-- db/fixed_development_seed.sql

-- =============================================================================
-- Development Seed Data (Fixed for Clean DB Reset)
-- Run this after schema_v3_unified.sql + complete database reset
-- Creates auth.users first, then profiles, then slots and bookings
-- =============================================================================

-- Clear existing data (if any)
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- =============================================================================
-- CREATE AUTH USERS FIRST (with proper password hashing)
-- Note: These are development-only test users with simple passwords
-- =============================================================================

-- Insert test users into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'alice@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'bob@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444',
  'authenticated',
  'authenticated',
  'david@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-5555-5555-555555555555',
  'authenticated',
  'authenticated',
  'eva@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
);

-- Create corresponding identities (with provider_id)
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  email
) VALUES 
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'alice@example.com'),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"bob@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'bob@example.com'),
('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'admin@example.com'),
('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub":"44444444-4444-4444-4444-444444444444","email":"david@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'david@example.com'),
('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '{"sub":"55555555-5555-5555-5555-555555555555","email":"eva@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'eva@example.com');

-- =============================================================================
-- NOW CREATE USER PROFILES (with proper FK references)
-- =============================================================================
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
-- Regular residents
('11111111-1111-1111-1111-111111111111', 'Alice Santos', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Reyes', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('44444444-4444-4444-4444-444444444444', 'David Chen', '201A', 'david@example.com', '09175555666', 'DEF-456', 'resident'),
('55555555-5555-5555-5555-555555555555', 'Eva Rodriguez', '202B', 'eva@example.com', '09176666777', 'GHI-789', 'resident'),

-- Admin user
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'MGMT', 'admin@example.com', '09170001122', 'ADMIN-01', 'admin');

-- =============================================================================
-- PARKING SLOTS (with ownership examples)
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
-- Owned slots (will be assigned to specific users)
('A-001', 'covered', 'available', '11111111-1111-1111-1111-111111111111', 'Near main entrance - Alice owned'),
('A-002', 'covered', 'available', '22222222-2222-2222-2222-222222222222', 'Near elevator - Bob owned'),
('A-003', 'covered', 'maintenance', NULL, 'Under repair - Shared when fixed'),
('A-004', 'covered', 'available', '44444444-4444-4444-4444-444444444444', 'Corner spot - David owned'),

-- Shared uncovered slots
('B-001', 'uncovered', 'available', NULL, 'Standard spot - Good for SUV'),
('B-002', 'uncovered', 'available', NULL, 'Standard spot - Compact cars preferred'),
('B-003', 'uncovered', 'available', NULL, 'Standard spot - Regular size'),
('B-004', 'uncovered', 'available', NULL, 'Standard spot - Near exit'),

-- Visitor slots (always shared)
('V-001', 'visitor', 'available', NULL, 'Visitor parking - Near reception'),
('V-002', 'visitor', 'available', NULL, 'Visitor parking - Easy access');

-- =============================================================================
-- SAMPLE BOOKINGS (mix of owned and shared slots)
-- =============================================================================
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
-- Alice booking her own slot
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 'confirmed', 'Alice using her owned slot A-001'),

-- Bob booking a shared slot
('22222222-2222-2222-2222-222222222222', 5, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'confirmed', 'Bob using shared slot B-001'),

-- David booking his own slot tomorrow
('44444444-4444-4444-4444-444444444444', 4, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 4 hours', 'confirmed', 'David booking his owned A-004 for tomorrow'),

-- Eva booking visitor slot
('55555555-5555-5555-5555-555555555555', 9, NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '2 hours', 'confirmed', 'Eva using visitor slot for guest'),

-- Past booking (completed)
('11111111-1111-1111-1111-111111111111', 6, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 'completed', 'Alice past booking'),

-- Cancelled booking
('22222222-2222-2222-2222-222222222222', 7, NOW() + INTERVAL '5 hours', NOW() + INTERVAL '8 hours', 'cancelled', 'Bob cancelled this booking');

-- =============================================================================
-- SAMPLE PAYMENTS (for testing payment features)
-- =============================================================================
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
VALUES
(1, 100.00, 'gcash', 'completed', 'GC2024001'),
(2, 75.00, 'cash', 'completed', 'CASH001'),
(3, 150.00, 'bank_transfer', 'pending', 'BT2024001'),
(4, 0.00, 'free', 'completed', 'FREE001'), -- Visitor slots might be free
(5, 100.00, 'gcash', 'completed', 'GC2024002'),
(6, 75.00, 'cash', 'refunded', 'CASH002'); -- Refunded due to cancellation

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify everything was created
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'User Profiles', COUNT(*) FROM user_profiles
UNION ALL  
SELECT 'Parking Slots', COUNT(*) FROM parking_slots
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments;

-- Check slot ownership distribution
SELECT 
  slot_type,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  COUNT(*) - COUNT(owner_id) as shared_slots
FROM parking_slots 
GROUP BY slot_type;

-- Show who owns what
SELECT 
  ps.slot_number, 
  ps.slot_type,
  COALESCE(up.name, 'SHARED') as owner_name,
  up.unit_number
FROM parking_slots ps
LEFT JOIN user_profiles up ON ps.owner_id = up.id
ORDER BY ps.slot_number;

-- =============================================================================
-- TEST USER CREDENTIALS
-- =============================================================================
/*
You can now log in with these test accounts:

alice@example.com / password123 (resident, owns A-001)
bob@example.com / password123 (resident, owns A-002)  
david@example.com / password123 (resident, owns A-004)
eva@example.com / password123 (resident, no owned slots)
admin@example.com / admin123 (admin user)

Test the slot ownership features:
- Alice should see A-001 as "Your Slot"
- Alice should be able to book A-001 anytime it's available
- Alice should NOT be able to book A-002 (Bob's slot)
- Alice CAN book shared slots (B-001, B-002, etc.)
- Admin should see all slots and be able to assign ownership
*/
```

```sql
-- db/migrations/000_migration_template.sql

-- =============================================================================
-- Migration: [DESCRIPTION]
-- Date: 2025-09-25
-- Author: Alfie Pelicano
-- =============================================================================

-- Add your migration SQL here
-- Example:
-- ALTER TABLE bookings ADD COLUMN new_field TEXT;
-- CREATE INDEX idx_bookings_new_field ON bookings(new_field);

-- Remember to:
-- 1. Test on development database first
-- 2. Add corresponding rollback instructions in comments
-- 3. Update any affected RLS policies
-- 4. Document breaking changes

-- Rollback instructions (commented):
-- DROP INDEX IF EXISTS idx_bookings_new_field;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS new_field;

```

```sql
-- db/migrations/001_create_user_profiles.sql

-- Migration: Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    vehicle_plate TEXT,
    role TEXT CHECK (role IN ('resident', 'admin')) DEFAULT 'resident',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- db/migrations/002_create_parking_slots.sql

-- Migration: Create parking_slots table
CREATE TABLE IF NOT EXISTS parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered', 'visitor')) DEFAULT 'uncovered',
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- db/migrations/003_create_bookings.sql

-- Migration: Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    slot_id INT NOT NULL REFERENCES parking_slots (slot_id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT booking_not_in_past CHECK (start_time >= NOW() - INTERVAL '1 hour')
);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
```

```sql
-- db/migrations/004_create_payments.sql

-- Migration: Create payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings (booking_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT CHECK (payment_method IN ('cash', 'gcash', 'bank_transfer', 'free')),
    reference_number TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- db/migrations/add_slot_ownership.sql

-- // =====================================================
-- // DATABASE MIGRATION - Run this first in Supabase SQL Editor
-- // File: db/migrations/add_slot_ownership.sql
-- // =====================================================

-- Add owner_id column to parking_slots
ALTER TABLE parking_slots
ADD COLUMN owner_id uuid REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX idx_parking_slots_owner ON parking_slots(owner_id);

-- Update RLS policies for ownership-aware booking
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;

CREATE POLICY "Users can book owned or shared slots"
  ON bookings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM parking_slots ps
      WHERE ps.slot_id = bookings.slot_id
        AND (ps.owner_id = auth.uid() OR ps.owner_id IS NULL)
    )
  );

-- Update viewing policy to show ownership info
DROP POLICY IF EXISTS "Anyone logged in can view slots" ON parking_slots;

CREATE POLICY "Users can view all slots with ownership info"
  ON parking_slots FOR SELECT
  USING (true);  -- Everyone can see all slots, but owner_id shows ownership
```

```sql
-- db/rls_policies.sql

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

```sql
-- db/schema.sql

-- =============================================================================
-- FILE: schema_v3_unified.sql (Unified Schema with Slot Ownership)
-- Run this in Supabase SQL Editor to replace both schema.sql + add_slot_ownership.sql
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
-- PARKING SLOTS TABLE (WITH OWNERSHIP SUPPORT)
-- =============================================================================
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered', 'visitor')) DEFAULT 'uncovered',
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available',
    owner_id uuid REFERENCES auth.users (id), -- NULL = shared/visitor slot
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
CREATE INDEX idx_parking_slots_owner ON parking_slots(owner_id); -- For ownership queries

-- =============================================================================
-- UPDATED RLS POLICIES (Ownership-aware)
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

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ========================================================
-- bookings policies (ownership-aware)
-- ========================================================
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (user_id = auth.uid());

-- Updated: Users can only book slots they own OR shared slots
CREATE POLICY "Users can book owned or shared slots"
  ON bookings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM parking_slots ps
      WHERE ps.slot_id = bookings.slot_id
        AND (ps.owner_id = auth.uid() OR ps.owner_id IS NULL)
    )
  );

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
-- parking_slots policies (ownership-aware)
-- ========================================================
-- Everyone can view all slots (with ownership info)
CREATE POLICY "Users can view all slots with ownership info"
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

```sql
-- db/seed_data.sql

-- =============================================================================
-- FILE 3: seed_data.sql (Test Data for Development)
-- Run this after RLS policies
-- =============================================================================

-- =============================================================================
-- Parking Slots Seed Data
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, description) VALUES
('A-001', 'covered', 'available', 'Near main entrance'),
('A-002', 'covered', 'available', 'Near elevator'),
('A-003', 'covered', 'maintenance', 'Under repair'),
('B-001', 'uncovered', 'available', 'Good for SUV'),
('B-002', 'uncovered', 'available', 'Compact cars preferred'),
('B-003', 'uncovered', 'available', 'Standard size'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking'),
('A1', 'covered', 'available', 'Near elevator'),
('B2', 'uncovered', 'available', 'Close to entrance');

-- =============================================================================
-- Sample User Profiles (Insert via Supabase Auth first, then update here)
-- NOTE: You'll need to create auth.users entries first via Supabase Auth UI
-- Then run these INSERTs with the actual UUIDs
-- =============================================================================
-- Example structure (replace with actual UUIDs after auth signup):
/*
INSERT INTO user_profiles (id, name, unit_number, email, role) VALUES
('UUID-FROM-AUTH-SIGNUP-1', 'Alice Santos', 'A-101', 'alice@example.com', 'resident'),
('UUID-FROM-AUTH-SIGNUP-2', 'Bob Reyes', 'B-202', 'bob@example.com', 'resident'),  
('UUID-FROM-AUTH-SIGNUP-3', 'Admin User', 'MGMT', 'admin@example.com', 'admin');
*/

-- Seed: Add test users and slots

-- Insert users (replace UUIDs with real ones from Supabase dashboard)
INSERT INTO user_profiles (id, name, unit_number, email, role, vehicle_plate)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice Resident', '101', 'alice@example.com', 'resident', 'ABC123'),
  ('00000000-0000-0000-0000-000000000002', 'Bob Admin', '102', 'bob@example.com', 'admin', 'XYZ789');
```

```sql
-- db/seeds/development_fixed.sql

-- =============================================================================
-- Development Seed Data (Fixed for Clean DB Reset)
-- Run this after schema_v3_unified.sql + complete database reset
-- Creates auth.users first, then profiles, then slots and bookings
-- =============================================================================

-- Clear existing data (if any)
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- =============================================================================
-- CREATE AUTH USERS FIRST (with proper password hashing)
-- Note: These are development-only test users with simple passwords
-- =============================================================================

-- Insert test users into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'alice@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'bob@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444',
  'authenticated',
  'authenticated',
  'david@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-5555-5555-555555555555',
  'authenticated',
  'authenticated',
  'eva@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
);

-- Create corresponding identities
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES 
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@example.com"}', 'email', NOW(), NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"bob@example.com"}', 'email', NOW(), NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@example.com"}', 'email', NOW(), NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub":"44444444-4444-4444-4444-444444444444","email":"david@example.com"}', 'email', NOW(), NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '{"sub":"55555555-5555-5555-5555-555555555555","email":"eva@example.com"}', 'email', NOW(), NOW(), NOW());

-- =============================================================================
-- NOW CREATE USER PROFILES (with proper FK references)
-- =============================================================================
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
-- Regular residents
('11111111-1111-1111-1111-111111111111', 'Alice Santos', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Reyes', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('44444444-4444-4444-4444-444444444444', 'David Chen', '201A', 'david@example.com', '09175555666', 'DEF-456', 'resident'),
('55555555-5555-5555-5555-555555555555', 'Eva Rodriguez', '202B', 'eva@example.com', '09176666777', 'GHI-789', 'resident'),

-- Admin user
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'MGMT', 'admin@example.com', '09170001122', 'ADMIN-01', 'admin');

-- =============================================================================
-- PARKING SLOTS (with ownership examples)
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
-- Owned slots (will be assigned to specific users)
('A-001', 'covered', 'available', '11111111-1111-1111-1111-111111111111', 'Near main entrance - Alice owned'),
('A-002', 'covered', 'available', '22222222-2222-2222-2222-222222222222', 'Near elevator - Bob owned'),
('A-003', 'covered', 'maintenance', NULL, 'Under repair - Shared when fixed'),
('A-004', 'covered', 'available', '44444444-4444-4444-4444-444444444444', 'Corner spot - David owned'),

-- Shared uncovered slots
('B-001', 'uncovered', 'available', NULL, 'Standard spot - Good for SUV'),
('B-002', 'uncovered', 'available', NULL, 'Standard spot - Compact cars preferred'),
('B-003', 'uncovered', 'available', NULL, 'Standard spot - Regular size'),
('B-004', 'uncovered', 'available', NULL, 'Standard spot - Near exit'),

-- Visitor slots (always shared)
('V-001', 'visitor', 'available', NULL, 'Visitor parking - Near reception'),
('V-002', 'visitor', 'available', NULL, 'Visitor parking - Easy access');

-- =============================================================================
-- SAMPLE BOOKINGS (mix of owned and shared slots)
-- =============================================================================
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
-- Alice booking her own slot
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 'confirmed', 'Alice using her owned slot A-001'),

-- Bob booking a shared slot
('22222222-2222-2222-2222-222222222222', 5, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'confirmed', 'Bob using shared slot B-001'),

-- David booking his own slot tomorrow
('44444444-4444-4444-4444-444444444444', 4, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 4 hours', 'confirmed', 'David booking his owned A-004 for tomorrow'),

-- Eva booking visitor slot
('55555555-5555-5555-5555-555555555555', 9, NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '2 hours', 'confirmed', 'Eva using visitor slot for guest'),

-- Past booking (completed)
('11111111-1111-1111-1111-111111111111', 6, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 'completed', 'Alice past booking'),

-- Cancelled booking
('22222222-2222-2222-2222-222222222222', 7, NOW() + INTERVAL '5 hours', NOW() + INTERVAL '8 hours', 'cancelled', 'Bob cancelled this booking');

-- =============================================================================
-- SAMPLE PAYMENTS (for testing payment features)
-- =============================================================================
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
VALUES
(1, 100.00, 'gcash', 'completed', 'GC2024001'),
(2, 75.00, 'cash', 'completed', 'CASH001'),
(3, 150.00, 'bank_transfer', 'pending', 'BT2024001'),
(4, 0.00, 'free', 'completed', 'FREE001'), -- Visitor slots might be free
(5, 100.00, 'gcash', 'completed', 'GC2024002'),
(6, 75.00, 'cash', 'refunded', 'CASH002'); -- Refunded due to cancellation

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify everything was created
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'User Profiles', COUNT(*) FROM user_profiles
UNION ALL  
SELECT 'Parking Slots', COUNT(*) FROM parking_slots
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments;

-- Check slot ownership distribution
SELECT 
  slot_type,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  COUNT(*) - COUNT(owner_id) as shared_slots
FROM parking_slots 
GROUP BY slot_type;

-- Show who owns what
SELECT 
  ps.slot_number, 
  ps.slot_type,
  COALESCE(up.name, 'SHARED') as owner_name,
  up.unit_number
FROM parking_slots ps
LEFT JOIN user_profiles up ON ps.owner_id = up.id
ORDER BY ps.slot_number;

-- =============================================================================
-- TEST USER CREDENTIALS
-- =============================================================================
/*
You can now log in with these test accounts:

alice@example.com / password123 (resident, owns A-001)
bob@example.com / password123 (resident, owns A-002)  
david@example.com / password123 (resident, owns A-004)
eva@example.com / password123 (resident, no owned slots)
admin@example.com / admin123 (admin user)

Test the slot ownership features:
- Alice should see A-001 as "Your Slot"
- Alice should be able to book A-001 anytime it's available
- Alice should NOT be able to book A-002 (Bob's slot)
- Alice CAN book shared slots (B-001, B-002, etc.)
- Admin should see all slots and be able to assign ownership
*/
```

```sql
-- db/seeds/development.sql

-- =============================================================================
-- Development Seed Data (Updated for Schema v3 with Slot Ownership)
-- Run this after schema_v3_unified.sql for development/testing
-- =============================================================================

-- Clear existing data (if any)
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- =============================================================================
-- PARKING SLOTS (with ownership examples)
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
-- Owned slots (will be assigned to users after they're created)
('A-001', 'covered', 'available', NULL, 'Near main entrance - Premium covered'),
('A-002', 'covered', 'available', NULL, 'Near elevator - Premium covered'),
('A-003', 'covered', 'maintenance', NULL, 'Under repair - Premium covered'),
('A-004', 'covered', 'available', NULL, 'Corner spot - Premium covered'),

-- Shared uncovered slots
('B-001', 'uncovered', 'available', NULL, 'Standard spot - Good for SUV'),
('B-002', 'uncovered', 'available', NULL, 'Standard spot - Compact cars preferred'),
('B-003', 'uncovered', 'available', NULL, 'Standard spot - Regular size'),
('B-004', 'uncovered', 'available', NULL, 'Standard spot - Near exit'),
('B-005', 'uncovered', 'available', NULL, 'Standard spot - Shaded area'),

-- Visitor slots (always shared)
('V-001', 'visitor', 'available', NULL, 'Visitor parking - Near reception'),
('V-002', 'visitor', 'available', NULL, 'Visitor parking - Easy access'),
('V-003', 'visitor', 'available', NULL, 'Visitor parking - Temporary only');

-- =============================================================================
-- TEST USER PROFILES
-- Note: These use fake UUIDs for development testing only
-- In production, users are created through auth signup
-- =============================================================================
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
-- Regular residents
('11111111-1111-1111-1111-111111111111', 'Alice Santos', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Reyes', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('44444444-4444-4444-4444-444444444444', 'David Chen', '201A', 'david@example.com', '09175555666', 'DEF-456', 'resident'),
('55555555-5555-5555-5555-555555555555', 'Eva Rodriguez', '202B', 'eva@example.com', '09176666777', 'GHI-789', 'resident'),

-- Admin user
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'MGMT', 'admin@example.com', '09170001122', 'ADMIN-01', 'admin'),

-- Test user without vehicle
('66666666-6666-6666-6666-666666666666', 'Frank Walker', '301A', 'frank@example.com', '09177777888', NULL, 'resident');

-- =============================================================================
-- ASSIGN SLOT OWNERSHIP (after users are created)
-- =============================================================================
-- Assign some slots to specific users
UPDATE parking_slots SET owner_id = '11111111-1111-1111-1111-111111111111' WHERE slot_number = 'A-001'; -- Alice owns A-001
UPDATE parking_slots SET owner_id = '22222222-2222-2222-2222-222222222222' WHERE slot_number = 'A-002'; -- Bob owns A-002
UPDATE parking_slots SET owner_id = '44444444-4444-4444-4444-444444444444' WHERE slot_number = 'A-004'; -- David owns A-004

-- Leave A-003 unowned (shared), plus all B and V slots remain shared

-- =============================================================================
-- SAMPLE BOOKINGS (mix of owned and shared slots)
-- =============================================================================
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
-- Alice booking her own slot
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 'confirmed', 'Alice using her owned slot A-001'),

-- Bob booking a shared slot
('22222222-2222-2222-2222-222222222222', 5, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'confirmed', 'Bob using shared slot B-001'),

-- David booking his own slot tomorrow
('44444444-4444-4444-4444-444444444444', 4, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 4 hours', 'confirmed', 'David booking his owned A-004 for tomorrow'),

-- Eva booking visitor slot
('55555555-5555-5555-5555-555555555555', 10, NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '2 hours', 'confirmed', 'Eva using visitor slot for guest'),

-- Past booking (completed)
('11111111-1111-1111-1111-111111111111', 6, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 'completed', 'Alice past booking'),

-- Cancelled booking
('22222222-2222-2222-2222-222222222222', 7, NOW() + INTERVAL '5 hours', NOW() + INTERVAL '8 hours', 'cancelled', 'Bob cancelled this booking');

-- =============================================================================
-- SAMPLE PAYMENTS (for testing payment features)
-- =============================================================================
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
VALUES
(1, 100.00, 'gcash', 'completed', 'GC2024001'),
(2, 75.00, 'cash', 'completed', 'CASH001'),
(3, 150.00, 'bank_transfer', 'pending', 'BT2024001'),
(4, 0.00, 'free', 'completed', 'FREE001'), -- Visitor slots might be free
(5, 100.00, 'gcash', 'completed', 'GC2024002'),
(6, 75.00, 'cash', 'refunded', 'CASH002'); -- Refunded due to cancellation

-- =============================================================================
-- VERIFICATION QUERIES (uncomment to run)
-- =============================================================================
/*
-- Check slot ownership distribution
SELECT 
  slot_type,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  COUNT(*) - COUNT(owner_id) as shared_slots
FROM parking_slots 
GROUP BY slot_type;

-- Check user types
SELECT role, COUNT(*) FROM user_profiles GROUP BY role;

-- Check booking statuses
SELECT status, COUNT(*) FROM bookings GROUP BY status;

-- Check who owns what
SELECT 
  ps.slot_number, 
  ps.slot_type,
  COALESCE(up.name, 'SHARED') as owner_name,
  up.unit_number
FROM parking_slots ps
LEFT JOIN user_profiles up ON ps.owner_id = up.id
ORDER BY ps.slot_number;
*/
```

```sql
-- db/seeds/fixed_development_seed.sql

-- =============================================================================
-- Development Seed Data (Fixed for Clean DB Reset)
-- Run this after schema_v3_unified.sql + complete database reset
-- Creates auth.users first, then profiles, then slots and bookings
-- =============================================================================

-- Clear existing data (if any)
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- =============================================================================
-- CREATE AUTH USERS FIRST (with proper password hashing)
-- Note: These are development-only test users with simple passwords
-- =============================================================================

-- Insert test users into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'alice@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'bob@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444',
  'authenticated',
  'authenticated',
  'david@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
),
(
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-5555-5555-555555555555',
  'authenticated',
  'authenticated',
  'eva@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NOW(),
  '',
  0,
  NOW(),
  '',
  NOW()
);

-- Create corresponding identities (with provider_id)
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  email
) VALUES 
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'alice@example.com'),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"bob@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'bob@example.com'),
('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'admin@example.com'),
('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub":"44444444-4444-4444-4444-444444444444","email":"david@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'david@example.com'),
('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '{"sub":"55555555-5555-5555-5555-555555555555","email":"eva@example.com","email_verified":true,"phone_verified":false}', 'email', NOW(), NOW(), NOW(), 'eva@example.com');

-- =============================================================================
-- NOW CREATE USER PROFILES (with proper FK references)
-- =============================================================================
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
-- Regular residents
('11111111-1111-1111-1111-111111111111', 'Alice Santos', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Reyes', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('44444444-4444-4444-4444-444444444444', 'David Chen', '201A', 'david@example.com', '09175555666', 'DEF-456', 'resident'),
('55555555-5555-5555-5555-555555555555', 'Eva Rodriguez', '202B', 'eva@example.com', '09176666777', 'GHI-789', 'resident'),

-- Admin user
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'MGMT', 'admin@example.com', '09170001122', 'ADMIN-01', 'admin');

-- =============================================================================
-- PARKING SLOTS (with ownership examples)
-- =============================================================================
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
-- Owned slots (will be assigned to specific users)
('A-001', 'covered', 'available', '11111111-1111-1111-1111-111111111111', 'Near main entrance - Alice owned'),
('A-002', 'covered', 'available', '22222222-2222-2222-2222-222222222222', 'Near elevator - Bob owned'),
('A-003', 'covered', 'maintenance', NULL, 'Under repair - Shared when fixed'),
('A-004', 'covered', 'available', '44444444-4444-4444-4444-444444444444', 'Corner spot - David owned'),

-- Shared uncovered slots
('B-001', 'uncovered', 'available', NULL, 'Standard spot - Good for SUV'),
('B-002', 'uncovered', 'available', NULL, 'Standard spot - Compact cars preferred'),
('B-003', 'uncovered', 'available', NULL, 'Standard spot - Regular size'),
('B-004', 'uncovered', 'available', NULL, 'Standard spot - Near exit'),

-- Visitor slots (always shared)
('V-001', 'visitor', 'available', NULL, 'Visitor parking - Near reception'),
('V-002', 'visitor', 'available', NULL, 'Visitor parking - Easy access');

-- =============================================================================
-- SAMPLE BOOKINGS (mix of owned and shared slots)
-- =============================================================================
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
-- Alice booking her own slot
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '4 hours', 'confirmed', 'Alice using her owned slot A-001'),

-- Bob booking a shared slot
('22222222-2222-2222-2222-222222222222', 5, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'confirmed', 'Bob using shared slot B-001'),

-- David booking his own slot tomorrow
('44444444-4444-4444-4444-444444444444', 4, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 4 hours', 'confirmed', 'David booking his owned A-004 for tomorrow'),

-- Eva booking visitor slot
('55555555-5555-5555-5555-555555555555', 9, NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '2 hours', 'confirmed', 'Eva using visitor slot for guest'),

-- Past booking (completed)
('11111111-1111-1111-1111-111111111111', 6, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 'completed', 'Alice past booking'),

-- Cancelled booking
('22222222-2222-2222-2222-222222222222', 7, NOW() + INTERVAL '5 hours', NOW() + INTERVAL '8 hours', 'cancelled', 'Bob cancelled this booking');

-- =============================================================================
-- SAMPLE PAYMENTS (for testing payment features)
-- =============================================================================
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
VALUES
(1, 100.00, 'gcash', 'completed', 'GC2024001'),
(2, 75.00, 'cash', 'completed', 'CASH001'),
(3, 150.00, 'bank_transfer', 'pending', 'BT2024001'),
(4, 0.00, 'free', 'completed', 'FREE001'), -- Visitor slots might be free
(5, 100.00, 'gcash', 'completed', 'GC2024002'),
(6, 75.00, 'cash', 'refunded', 'CASH002'); -- Refunded due to cancellation

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify everything was created
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'User Profiles', COUNT(*) FROM user_profiles
UNION ALL  
SELECT 'Parking Slots', COUNT(*) FROM parking_slots
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments;

-- Check slot ownership distribution
SELECT 
  slot_type,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  COUNT(*) - COUNT(owner_id) as shared_slots
FROM parking_slots 
GROUP BY slot_type;

-- Show who owns what
SELECT 
  ps.slot_number, 
  ps.slot_type,
  COALESCE(up.name, 'SHARED') as owner_name,
  up.unit_number
FROM parking_slots ps
LEFT JOIN user_profiles up ON ps.owner_id = up.id
ORDER BY ps.slot_number;

-- =============================================================================
-- TEST USER CREDENTIALS
-- =============================================================================
/*
You can now log in with these test accounts:

alice@example.com / password123 (resident, owns A-001)
bob@example.com / password123 (resident, owns A-002)  
david@example.com / password123 (resident, owns A-004)
eva@example.com / password123 (resident, no owned slots)
admin@example.com / admin123 (admin user)

Test the slot ownership features:
- Alice should see A-001 as "Your Slot"
- Alice should be able to book A-001 anytime it's available
- Alice should NOT be able to book A-002 (Bob's slot)
- Alice CAN book shared slots (B-001, B-002, etc.)
- Admin should see all slots and be able to assign ownership
*/
```

```sql
-- db/seeds/production.sql

-- =============================================================================
-- Production Seed Data (Updated for Schema v3 with Slot Ownership)
-- Minimal, real-world ready data for production deployment
-- =============================================================================

-- =============================================================================
-- PARKING SLOTS SETUP (Customize for your actual building)
-- =============================================================================

-- Premium covered parking (Level A) - These can be assigned to owners
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
('A-001', 'covered', 'available', NULL, 'Premium covered - Near elevator'),
('A-002', 'covered', 'available', NULL, 'Premium covered - Near entrance'),
('A-003', 'covered', 'available', NULL, 'Premium covered - Corner spot'),
('A-004', 'covered', 'available', NULL, 'Premium covered - Wide space'),
('A-005', 'covered', 'available', NULL, 'Premium covered - End unit');

-- Standard uncovered parking (Level B) - Mix of owned and shared
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
('B-001', 'uncovered', 'available', NULL, 'Standard - Good for compact cars'),
('B-002', 'uncovered', 'available', NULL, 'Standard - Regular size'),
('B-003', 'uncovered', 'available', NULL, 'Standard - SUV friendly'),
('B-004', 'uncovered', 'available', NULL, 'Standard - Near exit'),
('B-005', 'uncovered', 'available', NULL, 'Standard - Shaded area'),
('B-006', 'uncovered', 'available', NULL, 'Standard - Well-lit'),
('B-007', 'uncovered', 'available', NULL, 'Standard - Easy access'),
('B-008', 'uncovered', 'available', NULL, 'Standard - Back row');

-- Visitor parking (always shared)
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
('V-001', 'visitor', 'available', NULL, 'Visitor - Near reception'),
('V-002', 'visitor', 'available', NULL, 'Visitor - Easy access'),
('V-003', 'visitor', 'available', NULL, 'Visitor - Temporary parking only');

-- =============================================================================
-- INITIAL ADMIN SETUP
-- Note: This creates a template admin profile that needs to be linked
-- to a real auth.users account after signup
-- =============================================================================

-- No user profiles are inserted here - they will be created through:
-- 1. Users sign up through the app (creates auth.users)
-- 2. Profile is auto-created during signup process
-- 3. First user can be promoted to admin manually via SQL:
--    UPDATE user_profiles SET role = 'admin' WHERE email = 'your-admin@email.com';

-- =============================================================================
-- SLOT OWNERSHIP ASSIGNMENT (Optional - can be done via admin UI)
-- =============================================================================

-- Example: If you have deeded/assigned slots, you can assign them after users exist:
-- UPDATE parking_slots SET owner_id = 'user-uuid-here' WHERE slot_number = 'A-001';
-- 
-- Or leave all slots as shared initially and assign through admin interface

-- =============================================================================
-- CONFIGURATION NOTES FOR PRODUCTION
-- =============================================================================

/*
DEPLOYMENT CHECKLIST:

1. Database Setup:
   - Run schema_v3_unified.sql first
   - Run this production.sql seed file
   - Verify RLS policies are active

2. First Admin Setup:
   - Have admin sign up normally through /login
   - Manually promote to admin: UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@yourdomain.com';
   - Admin can then manage other users through /admin/users

3. Slot Assignment:
   - Use admin interface at /admin/slots to assign ownership
   - Or import via SQL if you have a spreadsheet of assignments

4. Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY  
   - SUPABASE_SERVICE_ROLE_KEY (for profile creation)

5. Email Configuration (for password reset):
   - Configure SMTP in Supabase Auth settings
   - Set password reset redirect URL

6. Optional Customizations:
   - Update slot numbers to match your building layout
   - Adjust slot types based on your parking structure
   - Modify descriptions to match your building features

SAMPLE SLOT ASSIGNMENTS (uncomment and modify as needed):
*/

-- Example: Assign slots to specific units (after users are created)
-- UPDATE parking_slots SET owner_id = (SELECT id FROM user_profiles WHERE unit_number = '101A') WHERE slot_number = 'A-001';
-- UPDATE parking_slots SET owner_id = (SELECT id FROM user_profiles WHERE unit_number = '102A') WHERE slot_number = 'A-002';

-- =============================================================================
-- VERIFICATION QUERIES (run these to check production setup)
-- =============================================================================

/*
-- Check slot distribution
SELECT 
  slot_type,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  COUNT(*) - COUNT(owner_id) as shared_slots
FROM parking_slots 
GROUP BY slot_type;

-- Check if any admin users exist
SELECT COUNT(*) as admin_count FROM user_profiles WHERE role = 'admin';

-- List all slots with ownership status
SELECT 
  slot_number,
  slot_type,
  status,
  CASE 
    WHEN owner_id IS NULL THEN 'SHARED'
    ELSE 'OWNED'
  END as ownership_status,
  description
FROM parking_slots 
ORDER BY slot_number;
*/
```

```sql
-- db/seeds/simple_dev_seed.sql

-- =============================================================================
-- Simple Development Approach: Just add slots to production.sql setup
-- Run this AFTER users have signed up normally through the app
-- =============================================================================

-- Add more slots for testing ownership features
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
-- Additional premium slots for testing
('A-006', 'covered', 'available', NULL, 'Premium covered - Test slot'),
('A-007', 'covered', 'available', NULL, 'Premium covered - Test slot'),
('A-008', 'covered', 'available', NULL, 'Premium covered - Test slot'),

-- More standard slots  
('B-009', 'uncovered', 'available', NULL, 'Standard - Test slot'),
('B-010', 'uncovered', 'available', NULL, 'Standard - Test slot'),
('B-011', 'uncovered', 'available', NULL, 'Standard - Test slot'),

-- Additional visitor slots
('V-004', 'visitor', 'available', NULL, 'Visitor - Test slot'),
('V-005', 'visitor', 'available', NULL, 'Visitor - Test slot');

-- =============================================================================
-- MANUAL TESTING WORKFLOW (recommended approach)
-- =============================================================================

/*
STEP-BY-STEP TESTING:

1. Use production.sql (clean slate)
2. Test signup flow:
   - Go to /login
   - Sign up as alice@test.com / password123
   - Sign up as bob@test.com / password123  
   - Sign up as admin@test.com / password123

3. Promote admin user:
   UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@test.com';

4. Test slot ownership assignment via admin UI:
   - Login as admin@test.com
   - Go to /admin/slots
   - Assign A-001 to Alice
   - Assign A-002 to Bob
   - Keep other slots as shared

5. Test ownership features:
   - Login as alice@test.com
   - Go to dashboard → should see A-001 as "Your Slot"
   - Try booking A-001 → should work
   - Try booking A-002 → should show "Reserved for another resident"
   - Try booking B-001 → should work (shared slot)

This approach tests:
✓ Real signup flow
✓ Profile creation during signup  
✓ Admin promotion
✓ Slot ownership assignment via UI
✓ Ownership validation in booking flow
✓ Mixed owned/shared slot behavior

Much more realistic than fake auth data!
*/

-- Quick verification of added slots
SELECT 
  COUNT(*) as total_slots,
  COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as owned_slots,
  COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as shared_slots
FROM parking_slots;
```

```sql
-- db/seeds/stress_test.sql

-- =============================================================================
-- Stress Test Seed Data - LUMIERE CONDO SCALE (realistic large dataset)
-- Based on: 1,655 Viber group members, likely 800-1,200 parking slots
-- Run this after schema_v3_unified.sql for REAL performance testing
-- =============================================================================

-- Clear existing data
TRUNCATE payments, bookings, parking_slots, user_profiles RESTART IDENTITY CASCADE;

-- =============================================================================
-- GENERATE 1,000 PARKING SLOTS (realistic for Lumiere-scale condo)
-- Multi-tower, multi-level parking structure
-- =============================================================================

-- North Tower - Premium covered (P1-P6) - 150 slots per level = 900 total
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
SELECT 
  'NT-P' || level || '-' || LPAD(slot_num::text, 3, '0'),
  'covered',
  CASE 
    WHEN random() < 0.05 THEN 'maintenance'
    WHEN random() < 0.02 THEN 'reserved'
    ELSE 'available'
  END,
  NULL, -- Will assign owners later
  'North Tower Level P' || level || ' - Premium covered'
FROM generate_series(1, 6) level,
     generate_series(1, 150) slot_num;

-- South Tower - Mixed covered/uncovered (B1-B3) - 100 slots per level = 300 total  
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
SELECT 
  'ST-B' || level || '-' || LPAD(slot_num::text, 3, '0'),
  CASE WHEN slot_num <= 50 THEN 'covered' ELSE 'uncovered' END,
  CASE 
    WHEN random() < 0.08 THEN 'maintenance'
    ELSE 'available'
  END,
  NULL,
  'South Tower Level B' || level || ' - ' || 
  CASE WHEN slot_num <= 50 THEN 'Covered' ELSE 'Uncovered' END
FROM generate_series(1, 3) level,
     generate_series(1, 100) slot_num;

-- Ground level visitor parking - 20 slots
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
SELECT 
  'VIS-' || LPAD(generate_series(1, 20)::text, 3, '0'),
  'visitor',
  'available',
  NULL,
  'Ground level visitor parking'
FROM generate_series(1, 20);

-- =============================================================================
-- GENERATE 800 TEST USERS (reflects real condo occupancy)
-- Lumiere context: 1,655 Viber members, but not all have cars
-- Estimate: ~50% car ownership = 800 potential app users
-- =============================================================================

-- Generate residents (750 users) - spread across many units
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
SELECT 
  ('10000000-0000-0000-' || LPAD(tower::text, 4, '0') || '-' || LPAD(generate_series(1, 750)::text, 8, '0'))::uuid,
  'Resident ' || generate_series(1, 750),
  CASE 
    WHEN generate_series(1, 750) % 2 = 0 THEN 'NT-'  -- North Tower
    ELSE 'ST-'  -- South Tower
  END || 
  LPAD((generate_series(1, 750) % 50 + 1)::text, 2, '0') || 
  CASE (generate_series(1, 750) % 4)
    WHEN 0 THEN 'A'
    WHEN 1 THEN 'B' 
    WHEN 2 THEN 'C'
    ELSE 'D'
  END,
  'resident' || generate_series(1, 750) || '@lumiere.ph',
  '0917' || LPAD((1000000 + generate_series(1, 750))::text, 7, '0'),
  CASE 
    WHEN generate_series(1, 750) % 8 = 0 THEN NULL -- 12.5% don't have cars
    ELSE 'LUM-' || LPAD(generate_series(1, 750)::text, 4, '0')
  END,
  'resident'
FROM generate_series(1, 750),
     generate_series(1, 2) tower;

-- Generate admin/management users (5 users)
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
SELECT 
  ('20000000-0000-0000-0000-' || LPAD(generate_series(1, 5)::text, 12, '0'))::uuid,
  CASE generate_series(1, 5)
    WHEN 1 THEN 'Property Manager'
    WHEN 2 THEN 'Security Chief'
    WHEN 3 THEN 'HOA President' 
    WHEN 4 THEN 'Maintenance Head'
    ELSE 'Admin Assistant'
  END,
  'MGMT-' || generate_series(1, 5),
  'admin' || generate_series(1, 5) || '@lumiere.ph',
  '0918' || LPAD((3000000 + generate_series(1, 5))::text, 7, '0'),
  'MGMT-' || LPAD(generate_series(1, 5)::text, 3, '0'),
  'admin'
FROM generate_series(1, 5);

-- =============================================================================
-- ASSIGN SLOT OWNERSHIP (70% of premium slots - reflects deeded parking reality)
-- =============================================================================

-- Assign North Tower premium slots (deeded parking common in high-end condos)
-- About 630 out of 900 NT slots get owners (70% ownership rate)
WITH random_assignments AS (
  SELECT 
    ps.slot_id,
    up.id as user_id,
    ROW_NUMBER() OVER (PARTITION BY ps.slot_id ORDER BY random()) as rn
  FROM parking_slots ps
  CROSS JOIN user_profiles up
  WHERE ps.slot_number LIKE 'NT-P%'
    AND ps.status = 'available'
    AND up.role = 'resident'
    AND up.vehicle_plate IS NOT NULL
)
UPDATE parking_slots ps
SET owner_id = ra.user_id
FROM random_assignments ra
WHERE ps.slot_id = ra.slot_id 
  AND ra.rn = 1
  AND ps.slot_id <= (SELECT COUNT(*) * 0.7 FROM parking_slots WHERE slot_number LIKE 'NT-P%');

-- Assign some South Tower covered slots (30% ownership rate)
WITH st_assignments AS (
  SELECT 
    ps.slot_id,
    up.id as user_id,
    ROW_NUMBER() OVER (PARTITION BY ps.slot_id ORDER BY random()) as rn
  FROM parking_slots ps
  CROSS JOIN user_profiles up
  WHERE ps.slot_number LIKE 'ST-B%'
    AND ps.slot_type = 'covered'
    AND ps.status = 'available'
    AND up.role = 'resident'
    AND up.vehicle_plate IS NOT NULL
  LIMIT 45  -- 30% of ~150 covered ST slots
)
UPDATE parking_slots ps
SET owner_id = st.user_id
FROM st_assignments st
WHERE ps.slot_id = st.slot_id AND st.rn = 1;

-- =============================================================================
-- GENERATE REALISTIC BOOKING VOLUME (2,000 bookings)
-- Based on Viber chat frequency - very active booking community
-- =============================================================================

-- Recent bookings (next 14 days) - 400 bookings
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
SELECT 
  up.id,
  ps.slot_id,
  NOW() + (random() * INTERVAL '14 days'),
  NOW() + (random() * INTERVAL '14 days') + INTERVAL '3 hours' + (random() * INTERVAL '8 hours'),
  CASE 
    WHEN random() < 0.85 THEN 'confirmed'
    ELSE 'cancelled'
  END,
  CASE 
    WHEN random() < 0.3 THEN 'Regular weekly booking'
    WHEN random() < 0.5 THEN 'Visitor coming over'
    WHEN random() < 0.7 THEN 'Weekend plans'
    ELSE 'Stress test booking #' || generate_series(1, 400)
  END
FROM generate_series(1, 400),
LATERAL (
  SELECT id FROM user_profiles WHERE role = 'resident' ORDER BY random() LIMIT 1
) up,
LATERAL (
  SELECT slot_id FROM parking_slots 
  WHERE status = 'available' 
    AND (owner_id = up.id OR owner_id IS NULL)
  ORDER BY random() 
  LIMIT 1
) ps;

-- Historical bookings (past 60 days) - 1,600 bookings
-- Reflects the high activity level seen in Viber group
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
SELECT 
  up.id,
  ps.slot_id,
  NOW() - (random() * INTERVAL '60 days'),
  NOW() - (random() * INTERVAL '60 days') + INTERVAL '2 hours' + (random() * INTERVAL '10 hours'),
  CASE 
    WHEN random() < 0.6 THEN 'completed'
    WHEN random() < 0.85 THEN 'cancelled'
    ELSE 'no_show'
  END,
  CASE 
    WHEN random() < 0.2 THEN 'Weekly parking rental'
    WHEN random() < 0.4 THEN 'Visitor parking for guest'
    WHEN random() < 0.6 THEN 'Weekend outing'
    WHEN random() < 0.8 THEN 'Business trip parking'
    ELSE 'Stress test historical #' || generate_series(1, 1600)
  END
FROM generate_series(1, 1600),
LATERAL (
  SELECT id FROM user_profiles WHERE role = 'resident' ORDER BY random() LIMIT 1
) up,
LATERAL (
  SELECT slot_id FROM parking_slots 
  WHERE status = 'available'
    AND (owner_id = up.id OR owner_id IS NULL)
  ORDER BY random() 
  LIMIT 1
) ps;

-- =============================================================================
-- GENERATE PAYMENT RECORDS (reflects ₱3K/month mentioned in Viber context)
-- =============================================================================
INSERT INTO payments (booking_id, amount, payment_method, status, reference_number)
SELECT 
  b.booking_id,
  CASE ps.slot_type
    WHEN 'covered' THEN 
      CASE ps.slot_number
        WHEN LIKE 'NT-P%' THEN 200.00 + (random() * 100) -- Premium North Tower
        ELSE 120.00 + (random() * 50) -- South Tower covered
      END
    WHEN 'uncovered' THEN 75.00 + (random() * 25)
    WHEN 'visitor' THEN 50.00 + (random() * 20) -- Visitor fee
  END,
  CASE 
    WHEN random() < 0.4 THEN 'gcash'  -- Popular in PH
    WHEN random() < 0.6 THEN 'cash'
    WHEN random() < 0.8 THEN 'bank_transfer'
    ELSE 'free'  -- Some visitor slots might be free
  END,
  CASE 
    WHEN b.status = 'completed' THEN 'completed'
    WHEN b.status = 'cancelled' THEN 'refunded'
    WHEN b.status = 'no_show' THEN 'completed' -- Still charged for no-show
    ELSE 'pending'
  END,
  'LUM-' || EXTRACT(year FROM b.created_at) || '-' || LPAD(b.booking_id::text, 6, '0')
FROM bookings b
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE b.status IN ('completed', 'cancelled', 'no_show', 'confirmed');

-- =============================================================================
-- LUMIERE-SCALE PERFORMANCE TEST SUMMARY
-- =============================================================================
/*
This dataset creates REALISTIC LUMIERE CONDO SCALE:
- 1,220 parking slots (900 NT premium + 300 ST mixed + 20 visitor)
- 755 users (750 residents + 5 admins) - reflects ~45% of 1,655 Viber members having cars
- 675 owned slots (70% NT + 30% ST covered) - realistic deeded parking ratio
- 2,000 bookings (400 future + 1,600 historical) - matches Viber activity level
- ~1,800 payment records - realistic transaction volume

PERFORMANCE BENCHMARKS TO TEST:
- SlotGrid rendering 1,220 slots (paginate if needed!)
- User search across 755 profiles
- Booking history with 2,000 records (pagination essential)
- Admin dashboard with real-world data volumes
- Database query performance under load
- Mobile performance with large datasets

VIBER GROUP CONTEXT INSIGHTS APPLIED:
- Heavy booking activity (as seen in chat frequency)
- Mix of owned/shared slots (P6 mentions show ownership variety)
- Premium pricing for covered slots
- High user engagement (1,655 members suggests active community)
- Payment via GCash (popular in Philippines)

This is REAL-WORLD STRESS TESTING for a successful deployment!
*/

-- Verify the massive dataset
SELECT 'LUMIERE SCALE DATASET' as info, 
       'Ready for real-world stress testing' as status;

SELECT 
  'Parking Slots' as category, 
  COUNT(*) as count,
  'Multi-tower, multi-level structure' as notes
FROM parking_slots
UNION ALL
SELECT 'Users', COUNT(*), '~45% of 1,655 Viber members with cars' FROM user_profiles
UNION ALL
SELECT 'Bookings', COUNT(*), 'High-activity booking community' FROM bookings
UNION ALL
SELECT 'Payments', COUNT(*), 'Reflects ₱3K/month rental market' FROM payments;

-- Check realistic ownership distribution
SELECT 
  CASE 
    WHEN slot_number LIKE 'NT-P%' THEN 'North Tower Premium'
    WHEN slot_number LIKE 'ST-B%' AND slot_type = 'covered' THEN 'South Tower Covered'
    WHEN slot_number LIKE 'ST-B%' AND slot_type = 'uncovered' THEN 'South Tower Uncovered'
    ELSE 'Visitor'
  END as area,
  COUNT(*) as total_slots,
  COUNT(owner_id) as owned_slots,
  ROUND(COUNT(owner_id)::numeric / COUNT(*) * 100, 1) as ownership_percentage
FROM parking_slots 
GROUP BY 
  CASE 
    WHEN slot_number LIKE 'NT-P%' THEN 'North Tower Premium'
    WHEN slot_number LIKE 'ST-B%' AND slot_type = 'covered' THEN 'South Tower Covered'
    WHEN slot_number LIKE 'ST-B%' AND slot_type = 'uncovered' THEN 'South Tower Uncovered'
    ELSE 'Visitor'
  END
ORDER BY ownership_percentage DESC;
```

```sql
-- db/setup_database.sql

-- =============================================================================
-- Complete Database Setup Script
-- Run this in Supabase SQL Editor for new installations
-- =============================================================================

-- 1. Create schema
\i schema.sql

-- 2. Apply security policies  
\i rls_policies.sql

-- 3. Load seed data (choose appropriate file)
-- For development:
-- \i seeds/development.sql
-- For production:
-- \i seeds/production.sql

```

```sql
-- db/simple_dev_seed.sql

-- =============================================================================
-- Simple Development Approach: Just add slots to production.sql setup
-- Run this AFTER users have signed up normally through the app
-- =============================================================================

-- Add more slots for testing ownership features
INSERT INTO parking_slots (slot_number, slot_type, status, owner_id, description)
VALUES
-- Additional premium slots for testing
('A-006', 'covered', 'available', NULL, 'Premium covered - Test slot'),
('A-007', 'covered', 'available', NULL, 'Premium covered - Test slot'),
('A-008', 'covered', 'available', NULL, 'Premium covered - Test slot'),

-- More standard slots  
('B-009', 'uncovered', 'available', NULL, 'Standard - Test slot'),
('B-010', 'uncovered', 'available', NULL, 'Standard - Test slot'),
('B-011', 'uncovered', 'available', NULL, 'Standard - Test slot'),

-- Additional visitor slots
('V-004', 'visitor', 'available', NULL, 'Visitor - Test slot'),
('V-005', 'visitor', 'available', NULL, 'Visitor - Test slot');

-- =============================================================================
-- MANUAL TESTING WORKFLOW (recommended approach)
-- =============================================================================

/*
STEP-BY-STEP TESTING:

1. Use production.sql (clean slate)
2. Test signup flow:
   - Go to /login
   - Sign up as alice@test.com / password123
   - Sign up as bob@test.com / password123  
   - Sign up as admin@test.com / password123

3. Promote admin user:
   UPDATE user_profiles SET role = 'admin' WHERE email = 'admin@test.com';

4. Test slot ownership assignment via admin UI:
   - Login as admin@test.com
   - Go to /admin/slots
   - Assign A-001 to Alice
   - Assign A-002 to Bob
   - Keep other slots as shared

5. Test ownership features:
   - Login as alice@test.com
   - Go to dashboard → should see A-001 as "Your Slot"
   - Try booking A-001 → should work
   - Try booking A-002 → should show "Reserved for another resident"
   - Try booking B-001 → should work (shared slot)

This approach tests:
✓ Real signup flow
✓ Profile creation during signup  
✓ Admin promotion
✓ Slot ownership assignment via UI
✓ Ownership validation in booking flow
✓ Mixed owned/shared slot behavior

Much more realistic than fake auth data!
*/

-- Quick verification of added slots
SELECT 
  COUNT(*) as total_slots,
  COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as owned_slots,
  COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as shared_slots
FROM parking_slots;
```

```sql
-- db/useful_queries.sql

-- =============================================================================
-- FILE 5: useful_queries.sql (Development Helper Queries)
-- =============================================================================

-- Check available slots for a time period
SELECT ps.slot_number, ps.slot_type, ps.status
FROM parking_slots ps
WHERE ps.status = 'available'
AND NOT EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.slot_id = ps.slot_id 
    AND b.status = 'confirmed'
    AND b.start_time < '2025-01-15 18:00:00'  -- replace with end time
    AND b.end_time > '2025-01-15 08:00:00'    -- replace with start time
);

-- Get user's current bookings
SELECT b.booking_id, ps.slot_number, b.start_time, b.end_time, b.status
FROM bookings b
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE b.user_id = 'USER-UUID-HERE'
AND b.status IN ('confirmed')
ORDER BY b.start_time;

-- Admin view: All bookings for today
SELECT 
    up.name, 
    up.unit_number,
    ps.slot_number, 
    b.start_time, 
    b.end_time, 
    b.status
FROM bookings b
JOIN user_profiles up ON b.user_id = up.id
JOIN parking_slots ps ON b.slot_id = ps.slot_id
WHERE DATE(b.start_time) = CURRENT_DATE
ORDER BY b.start_time;

-- Check for booking conflicts (useful for validation)
SELECT 
    b1.booking_id as booking1,
    b2.booking_id as booking2,
    b1.slot_id,
    b1.start_time, b1.end_time,
    b2.start_time, b2.end_time
FROM bookings b1
JOIN bookings b2 ON b1.slot_id = b2.slot_id 
WHERE b1.booking_id != b2.booking_id
AND b1.status = 'confirmed' 
AND b2.status = 'confirmed'
AND b1.start_time < b2.end_time 
AND b1.end_time > b2.start_time;
```

```sql
-- db/wipe_and_reset.sql

-- =============================================================================
-- FILE 4: wipe_and_reset.sql (Development Reset Script)
-- Use this when you need to completely reset your dev database
-- =============================================================================

-- WARNING: This deletes all data. Use only in development!

-- Drop policies first
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;

-- Drop tables
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS user_profiles;

-- Now re-run schema_v2.sql and rls_policies.sql
```

```sql
-- db/wipe_and_seed_testing.sql

-- =============================================================================
-- FILE: wipe_and_seed_testing.sql (Testing-friendly)
-- Stage 1 seed for Supabase local/dev testing
-- FK to auth.users temporarily removed to allow arbitrary UUIDs
-- =============================================================================

-- -----------------------------
-- DROP TABLES
-- -----------------------------
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS user_profiles;

-- -- =============================================================================
-- -- Re-enable FK to auth.users for real login testing
-- -- =============================================================================

-- -- WARNING: Only do this in local/dev. In production, never hardcode passwords.

-- -- Create a test user in Supabase Auth
-- insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
-- values (
--   '11111111-1111-1111-1111-111111111111', -- fixed UUID
--   '00000000-0000-0000-0000-000000000000',
--   'test@parkboard.app',
--   crypt('password123', gen_salt('bf')), -- bcrypt hash
--   now(),
--   '{"provider":"email","providers":["email"]}',
--   '{}',
--   now(),
--   now(),
--   'authenticated',
--   'authenticated'
-- );

-- -- Recreate user_profiles with real FK
-- create table user_profiles (
--   id uuid primary key references auth.users(id) on delete cascade,
--   name text not null,
--   unit_number text not null,
--   email text not null,
--   phone text,
--   vehicle_plate text,
--   role text check (role in ('resident','admin')) default 'resident',
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );

-- -- Insert profile row that matches auth.users
-- insert into user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
-- values (
--   '11111111-1111-1111-1111-111111111111',
--   'Alice Resident',
--   '101A',
--   'test@parkboard.app',
--   '09171234567',
--   'ABC-123',
--   'resident'
-- );


-- -----------------------------
-- USER PROFILES
-- -----------------------------
CREATE TABLE user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- FK to auth.users temporarily removed (local/dev testing only; DO NOT use in production)
    name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    vehicle_plate TEXT,
    role TEXT CHECK (role IN ('resident', 'admin')) DEFAULT 'resident',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample test users
INSERT INTO user_profiles (id, name, unit_number, email, phone, vehicle_plate, role)
VALUES
('11111111-1111-1111-1111-111111111111', 'Alice Resident', '101A', 'alice@example.com', '09171234567', 'ABC-123', 'resident'),
('22222222-2222-2222-2222-222222222222', 'Bob Resident', '102B', 'bob@example.com', '09179876543', 'XYZ-987', 'resident'),
('33333333-3333-3333-3333-333333333333', 'Carol Admin', 'HOA', 'carol@example.com', '09170001122', 'ADMIN-01', 'admin');

-- -----------------------------
-- PARKING SLOTS
-- -----------------------------
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered', 'visitor')) DEFAULT 'uncovered',
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample slots
INSERT INTO parking_slots (slot_number, slot_type, status, description)
VALUES
('A-001', 'covered', 'available', 'Near main entrance'),
('A-002', 'covered', 'available', 'Near elevator'),
('A-003', 'covered', 'maintenance', 'Under repair'),
('B-001', 'uncovered', 'available', 'Good for SUV'),
('B-002', 'uncovered', 'available', 'Compact cars preferred'),
('V-001', 'visitor', 'available', 'Visitor parking');

-- -----------------------------
-- BOOKINGS
-- -----------------------------
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id uuid NOT NULL, -- FK temporarily removed
    slot_id INT NOT NULL REFERENCES parking_slots (slot_id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT booking_not_in_past CHECK (start_time >= NOW() - INTERVAL '1 hour')
);

-- Sample bookings (user_id matches our test users)
INSERT INTO bookings (user_id, slot_id, start_time, end_time, status, notes)
VALUES
('11111111-1111-1111-1111-111111111111', 1, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hour', 'confirmed', 'First test booking'),
('22222222-2222-2222-2222-222222222222', 2, NOW() + INTERVAL '3 hour', NOW() + INTERVAL '4 hour', 'confirmed', 'Second test booking');

-- -----------------------------
-- PAYMENTS
-- -----------------------------
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings (booking_id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT CHECK (payment_method IN ('cash','gcash','bank_transfer','free')),
    reference_number TEXT,
    status TEXT CHECK (status IN ('pending','completed','failed','refunded')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample payments
INSERT INTO payments (booking_id, amount, payment_method, status)
VALUES
(1, 100.00, 'cash', 'completed'),
(2, 150.00, 'gcash', 'pending');

```

```sql
-- _deprecated/donations/005_create_donations.sql

-- Migration 005: Create donations table
CREATE TABLE IF NOT EXISTS donations (
  donation_id SERIAL PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'USD',
  message TEXT,
  status TEXT CHECK (status IN ('pending','completed','failed')) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

```


## Configuration Files

```typescript
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

```typescript
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


## Environment Configuration (Redacted)

```bash
// .env (sensitive values redacted)

NEXT_PUBLIC_SUPABASE_URL=***REDACTED***
SUPABASE_ANON_KEY=***REDACTED***

```

```bash
// .env.local (sensitive values redacted)

NEXT_PUBLIC_SUPABASE_URL=***REDACTED***
NEXT_PUBLIC_SUPABASE_ANON_KEY=***REDACTED***
SUPABASE_SERVICE_ROLE_KEY=***REDACTED***
NEXT_PUBLIC_DEV_MODE=***REDACTED***


```


## Package Dependencies

```json
// package.json

{
  "name": "parkboard",
  "version": "1.1.0",
  "description": "ParkBoard is a minimal parking booking web app for a small, vetted condo community. It follows a hotel-booking pattern (users, parking slots, bookings) and is built as an MVP using Supabase + Next.js + Tailwind.",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit"
  },
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


## Additional Project Files

```typescript
// .gitignore

.env
.env.local

# Playwright
node_modules/
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/

# Agent config files
/.github/copilot-instructions.md

# no source/config snapshots
*.md.backup
project_code_only.md

# automation tools
# stage_and_commit.sh
# export_frontend_and_config_to_md.sh
```


---

## Snapshot Summary

**Generated**: Monday, 29 September, 2025 08:39:10 AM PST  
**Timestamp**: 2025-09-29_083908  
**Total Size**: 304K  
**Exclusions**: Build artifacts, node_modules, auto-generated files, lengthy documentation  
**Security**: API keys and sensitive values redacted  

### Files Included:
- ✅ Complete application source code
- ✅ Database schemas and migrations  
- ✅ Configuration files
- ✅ Environment templates (redacted)
- ✅ Package dependencies

### Security Notes:
- 🔐 All API keys and sensitive values are redacted
- 🔐 Environment files show structure but hide values
- 🔐 No actual credentials are exposed in this snapshot

