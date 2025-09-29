"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthWrapper';
import AuthWrapper from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import { supabase } from '@/lib/supabase';

function AdminSlotsContent() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchSlots = async () => {
    setLoading(true);
    
    try {
      // Fetch slots first
      const { data: slotsData, error: slotsError } = await supabase
        .from('parking_slots')
        .select('*')
        .order('slot_number', { ascending: true });

      if (slotsError) {
        console.error('Error fetching slots:', slotsError);
        setSlots([]);
        setLoading(false);
        return;
      }

      // Fetch owner data separately
      const ownerIds = slotsData
        .map(slot => slot.owner_id)
        .filter(id => id !== null);

      if (ownerIds.length > 0) {
        const { data: ownersData } = await supabase
          .from('user_profiles')
          .select('id, name, unit_number')
          .in('id', ownerIds);

        // Merge owner data with slots
        const enrichedSlots = slotsData.map(slot => ({
          ...slot,
          owner: slot.owner_id 
            ? ownersData?.find(owner => owner.id === slot.owner_id)
            : null
        }));

        setSlots(enrichedSlots);
      } else {
        setSlots(slotsData);
      }
    } catch (error) {
      console.error('Error in fetchSlots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, name, unit_number, role')
      .eq('role', 'resident')
      .order('name');
    
    setUsers(data || []);
  };

  useEffect(() => {
    if (profile?.id) {
      fetchSlots();
      fetchUsers();
    }
  }, [profile?.id]);

  const handleStatusChange = async (slotId: number, newStatus: string) => {
    await supabase
      .from('parking_slots')
      .update({ status: newStatus })
      .eq('slot_id', slotId);
    
    fetchSlots();
  };

  const handleOwnerChange = async (slotId: number, newOwnerId: string | null) => {
    await supabase
      .from('parking_slots')
      .update({ owner_id: newOwnerId || null })
      .eq('slot_id', slotId);
    
    fetchSlots();
  };

  const handleEdit = (slot: any) => {
    setEditingSlot(slot);
  };

  const handleDelete = async (slotId: number) => {
    if (confirm('Are you sure you want to delete this slot?')) {
      await supabase
        .from('parking_slots')
        .delete()
        .eq('slot_id', slotId);
      
      fetchSlots();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await supabase
      .from('parking_slots')
      .update({
        slot_number: editingSlot.slot_number,
        slot_type: editingSlot.slot_type,
        status: editingSlot.status,
        description: editingSlot.description,
        owner_id: editingSlot.owner_id || null
      })
      .eq('slot_id', editingSlot.slot_id);
    
    setEditingSlot(null);
    fetchSlots();
  };

  const handleAddSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await supabase
      .from('parking_slots')
      .insert({
        slot_number: formData.get('slot_number'),
        slot_type: formData.get('slot_type'),
        status: formData.get('status'),
        description: formData.get('description'),
        owner_id: formData.get('owner_id') || null
      });
    
    setShowAddForm(false);
    fetchSlots();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Parking Slots</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add Slot'}
          </button>
        </div>

        {/* Add Slot Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add New Slot</h2>
            <form onSubmit={handleAddSlot} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="slot_number"
                placeholder="Slot Number (e.g., A-001)"
                className="px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <select
                name="slot_type"
                className="px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="covered">Covered</option>
                <option value="uncovered">Uncovered</option>
                <option value="visitor">Visitor</option>
              </select>
              <select
                name="status"
                className="px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
              <select
                name="owner_id"
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">No Owner (Shared)</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.unit_number}
                  </option>
                ))}
              </select>
              <input
                name="description"
                placeholder="Description (optional)"
                className="px-3 py-2 border border-gray-300 rounded-md md:col-span-2"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors md:col-span-2"
              >
                Add Slot
              </button>
            </form>
          </div>
        )}

        {/* Edit Slot Modal */}
        {editingSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold mb-4">Edit Slot</h2>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <input
                  value={editingSlot.slot_number}
                  onChange={(e) => setEditingSlot({...editingSlot, slot_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Slot Number"
                  required
                />
                <select
                  value={editingSlot.slot_type}
                  onChange={(e) => setEditingSlot({...editingSlot, slot_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="covered">Covered</option>
                  <option value="uncovered">Uncovered</option>
                  <option value="visitor">Visitor</option>
                </select>
                <select
                  value={editingSlot.status}
                  onChange={(e) => setEditingSlot({...editingSlot, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
                <select
                  value={editingSlot.owner_id || ''}
                  onChange={(e) => setEditingSlot({...editingSlot, owner_id: e.target.value || null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">No Owner (Shared)</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.unit_number}
                    </option>
                  ))}
                </select>
                <input
                  value={editingSlot.description || ''}
                  onChange={(e) => setEditingSlot({...editingSlot, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Description"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Slots Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
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

        {/* Summary Stats */}
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