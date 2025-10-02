// app/owner/slots/[slotId]/edit/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

export default function EditSlotPage() {
  return (
    <AuthWrapper>
      <EditSlotContent />
    </AuthWrapper>
  );
}

function EditSlotContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slotId = params.slotId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [slotData, setSlotData] = useState({
    slot_number: '',
    slot_type: 'covered',
    description: '',
    rental_rate_hourly: '',
    rental_rate_daily: '',
    owner_notes: '',
    is_listed_for_rent: true,
  });

  useEffect(() => {
    fetchSlotData();
  }, [slotId]);

  const fetchSlotData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('slot_id', slotId)
        .eq('owner_id', user!.id) // Ensure user owns this slot
        .single();

      if (error) throw error;

      setSlotData({
        slot_number: data.slot_number,
        slot_type: data.slot_type,
        description: data.description || '',
        rental_rate_hourly: data.rental_rate_hourly?.toString() || '',
        rental_rate_daily: data.rental_rate_daily?.toString() || '',
        owner_notes: data.owner_notes || '',
        is_listed_for_rent: data.is_listed_for_rent,
      });
    } catch (err: any) {
      console.error('Error fetching slot:', err);
      setError('Slot not found or you do not have permission to edit it');
      setTimeout(() => router.push('/owner'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const hourlyRate = parseFloat(slotData.rental_rate_hourly);
      const dailyRate = parseFloat(slotData.rental_rate_daily);
      
      if (isNaN(hourlyRate) || hourlyRate <= 0) {
        throw new Error('Please enter a valid hourly rate');
      }
      if (isNaN(dailyRate) || dailyRate <= 0) {
        throw new Error('Please enter a valid daily rate');
      }

      const { error: updateError } = await supabase
        .from('parking_slots')
        .update({
          slot_number: slotData.slot_number.trim(),
          slot_type: slotData.slot_type,
          description: slotData.description.trim(),
          rental_rate_hourly: hourlyRate,
          rental_rate_daily: dailyRate,
          owner_notes: slotData.owner_notes.trim(),
          is_listed_for_rent: slotData.is_listed_for_rent,
          updated_at: new Date().toISOString(),
        })
        .eq('slot_id', slotId)
        .eq('owner_id', user!.id);

      if (updateError) throw updateError;

      alert('✅ Slot updated successfully!');
      router.push('/owner');
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update slot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('⚠️ Are you sure you want to delete this slot? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will also delete all bookings associated with this slot. Continue?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('parking_slots')
        .delete()
        .eq('slot_id', slotId)
        .eq('owner_id', user!.id);

      if (deleteError) throw deleteError;

      alert('🗑️ Slot deleted successfully');
      router.push('/owner');
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Error deleting slot: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-3xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Edit Parking Slot
          </h1>
          <p className="text-lg text-gray-600">
            Update your slot details and pricing
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
          {/* Slot Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Slot Number *
            </label>
            <input
              type="text"
              required
              value={slotData.slot_number}
              onChange={(e) => setSlotData({...slotData, slot_number: e.target.value})}
              placeholder="e.g., A-101, B-205"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Slot Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Slot Type *
            </label>
            <select
              value={slotData.slot_type}
              onChange={(e) => setSlotData({...slotData, slot_type: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="covered">🏠 Covered</option>
              <option value="uncovered">☀️ Uncovered</option>
            </select>
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Pricing *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Hourly Rate (₱)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={slotData.rental_rate_hourly}
                  onChange={(e) => setSlotData({...slotData, rental_rate_hourly: e.target.value})}
                  placeholder="50"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Daily Rate (₱)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={slotData.rental_rate_daily}
                  onChange={(e) => setSlotData({...slotData, rental_rate_daily: e.target.value})}
                  placeholder="400"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={slotData.description}
              onChange={(e) => setSlotData({...slotData, description: e.target.value})}
              placeholder="e.g., Near elevator, wide slot good for SUVs"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Owner Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              value={slotData.owner_notes}
              onChange={(e) => setSlotData({...slotData, owner_notes: e.target.value})}
              placeholder="e.g., Watch the low ceiling, Gate code is 1234"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Listing Status */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={slotData.is_listed_for_rent}
                onChange={(e) => setSlotData({...slotData, is_listed_for_rent: e.target.checked})}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-semibold text-gray-900">List on Marketplace</div>
                <div className="text-sm text-gray-600">Make this slot available for rent</div>
              </div>
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/owner')}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Delete Section */}
          <div className="border-t border-red-200 pt-6 mt-6">
            <h3 className="font-semibold text-red-900 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-700 mb-4">
              Deleting this slot will remove it permanently and cancel all associated bookings.
            </p>
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete This Slot
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}