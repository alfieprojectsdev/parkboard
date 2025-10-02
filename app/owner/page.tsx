// app/owner/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function OwnerDashboardPage() {
  return (
    <AuthWrapper>
      <OwnerDashboardContent />
    </AuthWrapper>
  );
}

function OwnerDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Schedule management state
  const [scheduleType, setScheduleType] = useState<'quick' | 'recurring' | 'blackout'>('quick');
  const [quickUntil, setQuickUntil] = useState('');
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringStartTime, setRecurringStartTime] = useState('09:00');
  const [recurringEndTime, setRecurringEndTime] = useState('17:00');
  const [blackoutStart, setBlackoutStart] = useState('');
  const [blackoutEnd, setBlackoutEnd] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');

  useEffect(() => {
    fetchMySlots();
  }, []);

  const fetchMySlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select(`
          *,
          slot_availability_windows (count),
          slot_blackout_dates (count)
        `)
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSlots(data || []);
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleListing = async (slotId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({ is_listed_for_rent: !currentStatus })
        .eq('slot_id', slotId);

      if (error) throw error;
      fetchMySlots();
    } catch (err) {
      console.error('Error toggling listing:', err);
      alert('Failed to update listing status');
    }
  };

  const handleQuickAvailability = async () => {
    if (!selectedSlot || !quickUntil) return;

    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({
          quick_availability_active: true,
          quick_availability_until: quickUntil,
          quick_availability_posted_at: new Date().toISOString(),
          is_listed_for_rent: true,
        })
        .eq('slot_id', selectedSlot.slot_id);

      if (error) throw error;

      alert('✅ Posted as Available NOW!');
      setShowScheduleModal(false);
      fetchMySlots();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleRecurringSchedule = async () => {
    if (!selectedSlot || recurringDays.length === 0) return;

    try {
      const { error } = await supabase
        .from('slot_availability_windows')
        .insert({
          slot_id: selectedSlot.slot_id,
          day_of_week: recurringDays,
          start_time: recurringStartTime,
          end_time: recurringEndTime,
        });

      if (error) throw error;

      alert('✅ Recurring schedule added!');
      setShowScheduleModal(false);
      fetchMySlots();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleBlackoutDate = async () => {
    if (!selectedSlot || !blackoutStart || !blackoutEnd) return;

    try {
      const { error } = await supabase
        .from('slot_blackout_dates')
        .insert({
          slot_id: selectedSlot.slot_id,
          blackout_start: new Date(blackoutStart).toISOString(),
          blackout_end: new Date(blackoutEnd).toISOString(),
          reason: blackoutReason,
        });

      if (error) throw error;

      alert('✅ Blackout period added!');
      setShowScheduleModal(false);
      setBlackoutStart('');
      setBlackoutEnd('');
      setBlackoutReason('');
      fetchMySlots();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Parking Slots</h1>
            <p className="text-gray-600">Manage your listings and availability</p>
          </div>
          <Link
            href="/owner/setup"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add New Slot
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-600 mb-4">You haven't listed any slots yet</p>
            <Link href="/owner/setup" className="text-blue-600 hover:underline">
              List your first slot →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slots.map((slot) => (
              <div key={slot.slot_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {slot.unique_identifier || slot.slot_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {slot.building_tower && `${slot.building_tower} • `}
                        {slot.floor_level || 'No floor set'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      slot.is_listed_for_rent
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {slot.is_listed_for_rent ? 'Listed' : 'Unlisted'}
                    </span>
                  </div>

                  {/* Quick Availability Badge */}
                  {slot.quick_availability_active && (
                    <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                      ⚡ Available NOW until {new Date(slot.quick_availability_until).toLocaleString('en-PH')}
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="mb-4 flex justify-between text-sm">
                    <div>
                      <div className="text-gray-600">Hourly</div>
                      <div className="font-bold text-blue-600">₱{slot.rental_rate_hourly}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Daily</div>
                      <div className="font-bold text-purple-600">₱{slot.rental_rate_daily}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedSlot(slot);
                        setShowScheduleModal(true);
                      }}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                    >
                      📅 Manage Schedule
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleListing(slot.slot_id, slot.is_listed_for_rent)}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          slot.is_listed_for_rent
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {slot.is_listed_for_rent ? 'Unlist' : 'List'}
                      </button>
                      <Link
                        href={`/owner/slots/${slot.slot_id}/edit`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-center"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Schedule Management Modal */}
      {showScheduleModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Manage Availability - {selectedSlot.slot_number}</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Schedule Type Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setScheduleType('quick')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  scheduleType === 'quick'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                🚀 Available NOW
              </button>
              <button
                onClick={() => setScheduleType('recurring')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  scheduleType === 'recurring'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                🔄 Recurring Schedule
              </button>
              <button
                onClick={() => setScheduleType('blackout')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  scheduleType === 'blackout'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                🚫 Blackout Dates
              </button>
            </div>

            {/* Quick Availability */}
            {scheduleType === 'quick' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Post immediate availability (Viber-style "Available NOW")</p>
                <div>
                  <label className="block text-sm font-medium mb-2">Available until:</label>
                  <input
                    type="datetime-local"
                    value={quickUntil}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setQuickUntil(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <button
                  onClick={handleQuickAvailability}
                  className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                >
                  Post as Available NOW
                </button>
              </div>
            )}

            {/* Recurring Schedule (Mary Lou's scenario) */}
            {scheduleType === 'recurring' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Set recurring weekly availability</p>

                <div>
                  <label className="block text-sm font-medium mb-2">Days of the week:</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Mon', value: 1 },
                      { label: 'Tue', value: 2 },
                      { label: 'Wed', value: 3 },
                      { label: 'Thu', value: 4 },
                      { label: 'Fri', value: 5 },
                      { label: 'Sat', value: 6 },
                      { label: 'Sun', value: 0 },
                    ].map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => {
                          if (recurringDays.includes(value)) {
                            setRecurringDays(recurringDays.filter(d => d !== value));
                          } else {
                            setRecurringDays([...recurringDays, value]);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg font-medium ${
                          recurringDays.includes(value)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start time:</label>
                    <input
                      type="time"
                      value={recurringStartTime}
                      onChange={(e) => setRecurringStartTime(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End time:</label>
                    <input
                      type="time"
                      value={recurringEndTime}
                      onChange={(e) => setRecurringEndTime(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRecurringSchedule}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  Add Recurring Schedule
                </button>
              </div>
            )}

            {/* Blackout Dates (Mary Lou's "Taken" list) */}
            {scheduleType === 'blackout' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Block off dates when slot is NOT available</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start date/time:</label>
                    <input
                      type="datetime-local"
                      value={blackoutStart}
                      onChange={(e) => setBlackoutStart(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End date/time:</label>
                    <input
                      type="datetime-local"
                      value={blackoutEnd}
                      onChange={(e) => setBlackoutEnd(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason (optional):</label>
                  <input
                    type="text"
                    value={blackoutReason}
                    onChange={(e) => setBlackoutReason(e.target.value)}
                    placeholder="e.g., Personal use, maintenance"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <button
                  onClick={handleBlackoutDate}
                  className="w-full px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                >
                  Add Blackout Period
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
