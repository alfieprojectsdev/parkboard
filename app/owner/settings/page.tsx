// app/owner/settings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <AuthWrapper>
      <SettingsContent />
    </AuthWrapper>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [settings, setSettings] = useState({
    allow_instant_booking: true,
    require_owner_approval: false,
    min_rental_hours: 1,
    max_rental_hours: 24,
    advance_booking_days: 30,
    parking_instructions: '',
    access_instructions: '',
    special_requirements: '',
    notify_on_booking: true,
    notify_on_cancellation: true,
    notification_email: '',
    notification_phone: '',
  });

  useEffect(() => {
    if (user) {
      fetchSlots();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSlot) {
      fetchSettings(selectedSlot);
    }
  }, [selectedSlot]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select('slot_id, slot_number')
        .eq('owner_id', user!.id)
        .order('slot_number');

      if (error) throw error;
      setSlots(data || []);
      
      if (data && data.length > 0) {
        setSelectedSlot(data[0].slot_id);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async (slotId: number) => {
    try {
      const { data, error } = await supabase
        .from('slot_rental_settings')
        .select('*')
        .eq('slot_id', slotId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          allow_instant_booking: data.allow_instant_booking,
          require_owner_approval: data.require_owner_approval,
          min_rental_hours: data.min_rental_hours,
          max_rental_hours: data.max_rental_hours,
          advance_booking_days: data.advance_booking_days,
          parking_instructions: data.parking_instructions || '',
          access_instructions: data.access_instructions || '',
          special_requirements: data.special_requirements || '',
          notify_on_booking: data.notify_on_booking,
          notify_on_cancellation: data.notify_on_cancellation,
          notification_email: data.notification_email || '',
          notification_phone: data.notification_phone || '',
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('slot_rental_settings')
        .upsert({
          slot_id: selectedSlot,
          owner_id: user!.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'slot_id'
        });

      if (error) throw error;

      setMessage({ type: 'success', text: '✅ Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: 'Failed to save settings: ' + err.message });
    } finally {
      setSaving(false);
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

  if (slots.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Slots to Configure</h2>
            <p className="text-gray-600 mb-6">
              You need to list a parking slot before you can configure rental settings.
            </p>
            <Link
              href="/owner/setup"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              List Your First Slot
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rental Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure how renters can book your slots
            </p>
          </div>
          <Link
            href="/owner"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            ← Back
          </Link>
        </div>

        {/* Slot Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Slot to Configure
          </label>
          <select
            value={selectedSlot || ''}
            onChange={(e) => setSelectedSlot(parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {slots.map((slot) => (
              <option key={slot.slot_id} value={slot.slot_id}>
                Slot {slot.slot_number}
              </option>
            ))}
          </select>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Booking Rules */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Rules</h2>
            
            <div className="space-y-4">
              {/* Instant Booking */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allow_instant_booking}
                  onChange={(e) => setSettings({
                    ...settings, 
                    allow_instant_booking: e.target.checked,
                    require_owner_approval: !e.target.checked
                  })}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-gray-900">Allow Instant Booking</div>
                  <div className="text-sm text-gray-600">
                    Renters can book immediately without your approval
                  </div>
                </div>
              </label>

              {/* Owner Approval */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.require_owner_approval}
                  onChange={(e) => setSettings({
                    ...settings, 
                    require_owner_approval: e.target.checked,
                    allow_instant_booking: !e.target.checked
                  })}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-gray-900">Require Owner Approval</div>
                  <div className="text-sm text-gray-600">
                    Review and approve each booking request manually
                  </div>
                </div>
              </label>

              {/* Rental Duration */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Rental (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.min_rental_hours}
                    onChange={(e) => setSettings({...settings, min_rental_hours: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Rental (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.max_rental_hours}
                    onChange={(e) => setSettings({...settings, max_rental_hours: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Advance Booking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance Booking Window (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={settings.advance_booking_days}
                  onChange={(e) => setSettings({...settings, advance_booking_days: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How far in advance renters can book (e.g., 30 days)
                </p>
              </div>
            </div>
          </div>

          {/* Instructions for Renters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Instructions for Renters</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parking Instructions
                </label>
                <textarea
                  value={settings.parking_instructions}
                  onChange={(e) => setSettings({...settings, parking_instructions: e.target.value})}
                  placeholder="e.g., Enter from the north gate, my slot is on the 3rd floor"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Instructions
                </label>
                <textarea
                  value={settings.access_instructions}
                  onChange={(e) => setSettings({...settings, access_instructions: e.target.value})}
                  placeholder="e.g., Gate code is 1234, Use the building key card"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requirements
                </label>
                <textarea
                  value={settings.special_requirements}
                  onChange={(e) => setSettings({...settings, special_requirements: e.target.value})}
                  placeholder="e.g., No vehicles over 2m height, Compact cars only"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Notifications</h2>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notify_on_booking}
                  onChange={(e) => setSettings({...settings, notify_on_booking: e.target.checked})}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-gray-900">Notify on New Booking</div>
                  <div className="text-sm text-gray-600">
                    Get notified when someone books your slot
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notify_on_cancellation}
                  onChange={(e) => setSettings({...settings, notify_on_cancellation: e.target.checked})}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-gray-900">Notify on Cancellation</div>
                  <div className="text-sm text-gray-600">
                    Get notified when a booking is cancelled
                  </div>
                </div>
              </label>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Email (Optional)
                </label>
                <input
                  type="email"
                  value={settings.notification_email}
                  onChange={(e) => setSettings({...settings, notification_email: e.target.value})}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to use your account email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={settings.notification_phone}
                  onChange={(e) => setSettings({...settings, notification_phone: e.target.value})}
                  placeholder="09171234567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For SMS notifications (feature coming soon)
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/owner')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}