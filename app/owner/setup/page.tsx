// app/owner/setup/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';

export default function OwnerSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [slotData, setSlotData] = useState({
    slot_number: '',
    slot_type: 'covered',
    description: '',
    rental_rate_hourly: '',
    rental_rate_daily: '',
    owner_notes: '',
  });

  // New fields for P6 fix
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
      // Create the parking slot with new fields
      const { data: slot, error: slotError } = await supabase
        .from('parking_slots')
        .insert([{
          slot_number: slotData.slot_number,
          slot_type: slotData.slot_type,
          description: slotData.description,
          status: 'available',
          owner_id: user!.id,
          is_listed_for_rent: true,
          rental_rate_hourly: parseFloat(slotData.rental_rate_hourly),
          rental_rate_daily: parseFloat(slotData.rental_rate_daily),
          owner_notes: slotData.owner_notes,
          managed_by: 'owner',
          // New Viber migration fields
          building_tower: buildingTower,
          floor_level: floorLevel,
          location_tags: locationTags,
        }])
        .select()
        .single();

      if (slotError) throw slotError;

      // Create default rental settings
      const { error: settingsError } = await supabase
        .from('slot_rental_settings')
        .insert([{
          slot_id: slot.slot_id,
          owner_id: user!.id,
          allow_instant_booking: true,
          min_rental_hours: 1,
          max_rental_hours: 24,
        }]);

      if (settingsError) throw settingsError;

      // Handle quick availability if set
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

      alert('🎉 Your slot is now listed!');
      router.push('/owner');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">List Your Parking Slot</h1>
      <p className="text-gray-600 mb-8">
        Fill in the details below to start earning from your parking slot.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* P6 Fix: Floor, Tower, Slot Number Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Floor Level *
            </label>
            <select
              value={floorLevel}
              onChange={(e) => setFloorLevel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select floor</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
              <option value="P5">P5</option>
              <option value="P6">P6</option>
              <option value="B1">B1 (Basement)</option>
              <option value="B2">B2 (Basement)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building/Tower *
            </label>
            <select
              value={buildingTower}
              onChange={(e) => setBuildingTower(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select tower</option>
              <option value="North Tower">North Tower</option>
              <option value="South Tower">South Tower</option>
              <option value="East Tower">East Tower</option>
              <option value="West Tower">West Tower</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slot Number *
            </label>
            <input
              type="text"
              value={slotData.slot_number}
              onChange={(e) => setSlotData({...slotData, slot_number: e.target.value})}
              placeholder="001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              maxLength={3}
              required
            />
          </div>
        </div>
        <p className="text-xs text-blue-600 -mt-4">
          📍 Will create unique ID: <strong>{generateUniqueSlotId(floorLevel, buildingTower, slotData.slot_number)}</strong>
        </p>

        {/* Location Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Features (helps renters find you faster)
          </label>
          <div className="flex flex-wrap gap-2">
            {['near elevator', 'near exit', 'easy access', 'corner spot',
              'near entrance', 'well-lit', 'CCTV covered', 'wide space'].map(tag => (
              <label key={tag} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  value={tag}
                  checked={locationTags.includes(tag)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setLocationTags([...locationTags, tag]);
                    } else {
                      setLocationTags(locationTags.filter(t => t !== tag));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                  {tag}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Slot Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slot Type *
          </label>
          <select
            value={slotData.slot_type}
            onChange={(e) => setSlotData({...slotData, slot_type: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="covered">Covered</option>
            <option value="uncovered">Uncovered</option>
          </select>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate (₱) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={slotData.rental_rate_hourly}
              onChange={(e) => setSlotData({...slotData, rental_rate_hourly: e.target.value})}
              placeholder="50"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Rate (₱) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={slotData.rental_rate_daily}
              onChange={(e) => setSlotData({...slotData, rental_rate_daily: e.target.value})}
              placeholder="400"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={slotData.description}
            onChange={(e) => setSlotData({...slotData, description: e.target.value})}
            placeholder="e.g., Near elevator, good for compact cars"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Owner Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            value={slotData.owner_notes}
            onChange={(e) => setSlotData({...slotData, owner_notes: e.target.value})}
            placeholder="e.g., Watch the low ceiling, Access code is 1234"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quick Availability (Viber-style "Available NOW") */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-2">Quick Availability (Viber-style)</h3>
          <button
            type="button"
            onClick={() => setShowQuickPost(!showQuickPost)}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            🚀 Available NOW
          </button>

          {showQuickPost && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <label className="block text-sm font-medium mb-2">
                Available until:
              </label>
              <input
                type="datetime-local"
                value={quickAvailableUntil}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setQuickAvailableUntil(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
              <p className="text-xs text-gray-600 mt-2">
                ✨ This will mark your slot as "Available NOW" on the marketplace
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'List My Slot'}
          </button>
        </div>
      </form>
    </div>
  );
}
