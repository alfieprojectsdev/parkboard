// app/owner/setup/page.tsx - FIXED with AuthWrapper
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

// Wrap the entire page export
export default function OwnerSetupPage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <OwnerSetupContent />
      </div>
    </AuthWrapper>
  );
}

// The actual page content as a separate component
function OwnerSetupContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [slotData, setSlotData] = useState({
    slot_number: '',
    slot_type: 'covered',
    description: '',
    rental_rate_hourly: '50',
    rental_rate_daily: '400',
    owner_notes: '',
  });

  // New fields for P6 fix (Viber migration)
  const [floorLevel, setFloorLevel] = useState('');
  const [buildingTower, setBuildingTower] = useState('');
  const [locationTags, setLocationTags] = useState<string[]>([]);
  const [showQuickPost, setShowQuickPost] = useState(false);
  const [quickAvailableUntil, setQuickAvailableUntil] = useState('');

  const generateUniqueSlotId = (floor: string, tower: string, number: string) => {
    if (!floor || !tower || !number) return 'Preview will show here';
    const towerId = tower.substring(0, 2).toUpperCase();
    return `${floor}-${towerId}-${number.padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate unique identifier
      const uniqueId = generateUniqueSlotId(floorLevel, buildingTower, slotData.slot_number);

      // Create the parking slot with new fields
      const { data: slot, error: slotError } = await supabase
        .from('parking_slots')
        .insert({
          slot_number: slotData.slot_number,
          slot_type: slotData.slot_type,
          description: slotData.description,
          status: 'available',
          owner_id: user!.id,
          is_listed_for_rent: true,
          rental_rate_hourly: parseFloat(slotData.rental_rate_hourly) || 0,
          rental_rate_daily: parseFloat(slotData.rental_rate_daily) || 0,
          owner_notes: slotData.owner_notes,
          managed_by: 'owner',
          // Viber migration fields
          building_tower: buildingTower,
          floor_level: floorLevel,
          unique_identifier: uniqueId,
        })
        .select()
        .single();

      if (slotError) throw slotError;

      // If quick availability is enabled, set it up
      if (showQuickPost && quickAvailableUntil) {
        const { error: quickError } = await supabase
          .from('parking_slots')
          .update({
            quick_availability_active: true,
            quick_availability_until: quickAvailableUntil,
            quick_availability_posted_at: new Date().toISOString(),
          })
          .eq('slot_id', slot.slot_id);

        if (quickError) console.error('Quick availability error:', quickError);
      }

      // Create default rental settings
      const { error: settingsError } = await supabase
        .from('slot_rental_settings')
        .insert({
          slot_id: slot.slot_id,
          min_booking_hours: 1,
          max_booking_hours: 168, // 1 week
          auto_approve: true,
          payment_methods: ['gcash', 'maya', 'cash'],
          special_instructions: slotData.owner_notes || 'Please coordinate payment and access.',
        });

      if (settingsError) console.error('Settings error:', settingsError);

      // Update user profile to mark as owner
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ user_type: 'owner' })
        .eq('id', user!.id);

      if (profileError) console.error('Profile update error:', profileError);

      alert('✅ Slot listed successfully!');
      router.push('/owner');
    } catch (err: any) {
      console.error('Error creating slot:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLocationTag = (tag: string) => {
    setLocationTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">List Your Parking Slot</h1>
        <p className="text-gray-600 mb-6">
          Set up your parking slot for rent on the marketplace
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Basic Information</h2>

            {/* Location fields (Viber migration fix) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building/Tower *
                </label>
                <input
                  type="text"
                  value={buildingTower}
                  onChange={(e) => setBuildingTower(e.target.value)}
                  placeholder="e.g., North Tower"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor Level *
                </label>
                <input
                  type="text"
                  value={floorLevel}
                  onChange={(e) => setFloorLevel(e.target.value)}
                  placeholder="e.g., P6, P5, Ground"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slot Number *
              </label>
              <input
                type="text"
                value={slotData.slot_number}
                onChange={(e) => setSlotData({ ...slotData, slot_number: e.target.value })}
                placeholder="e.g., 001, A-101"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Unique ID Preview: <strong>{generateUniqueSlotId(floorLevel, buildingTower, slotData.slot_number)}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slot Type *
              </label>
              <select
                value={slotData.slot_type}
                onChange={(e) => setSlotData({ ...slotData, slot_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="covered">Covered</option>
                <option value="uncovered">Uncovered</option>
              </select>
            </div>

            {/* Location Tags (Viber migration) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Features (helps renters find your slot)
              </label>
              <div className="flex flex-wrap gap-2">
                {['near elevator', 'near entrance', 'near stairs', 'corner slot', 'wide slot', 'easy access'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleLocationTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      locationTags.includes(tag)
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {locationTags.includes(tag) ? '✓ ' : ''}{tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={slotData.description}
                onChange={(e) => setSlotData({ ...slotData, description: e.target.value })}
                placeholder="Describe your parking slot (location, size, any special features)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add location tags: {locationTags.join(', ') || 'None selected'}
              </p>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Pricing</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (₱) *
                </label>
                <input
                  type="number"
                  value={slotData.rental_rate_hourly}
                  onChange={(e) => setSlotData({ ...slotData, rental_rate_hourly: e.target.value })}
                  placeholder="50"
                  required
                  min="0"
                  step="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Rate (₱) *
                </label>
                <input
                  type="number"
                  value={slotData.rental_rate_daily}
                  onChange={(e) => setSlotData({ ...slotData, rental_rate_daily: e.target.value })}
                  placeholder="400"
                  required
                  min="0"
                  step="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              💡 Tip: Average rates in the building are ₱50/hour and ₱400/day
            </p>
          </div>

          {/* Quick Availability (Viber migration feature) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Quick Availability</h2>
              <button
                type="button"
                onClick={() => setShowQuickPost(!showQuickPost)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showQuickPost ? '− Hide' : '+ Add "Available NOW"'}
              </button>
            </div>

            {showQuickPost && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  Post your slot as "Available NOW" - perfect for urgent rentals!
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available Until
                  </label>
                  <input
                    type="datetime-local"
                    value={quickAvailableUntil}
                    onChange={(e) => setQuickAvailableUntil(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Owner Notes Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Rental Instructions</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions for Renters
              </label>
              <textarea
                value={slotData.owner_notes}
                onChange={(e) => setSlotData({ ...slotData, owner_notes: e.target.value })}
                placeholder="e.g., Please coordinate via GCash at 09XX-XXX-XXXX. Access card available at lobby."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Creating...' : 'List My Slot'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}