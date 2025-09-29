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