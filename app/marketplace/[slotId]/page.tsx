// app/marketplace/[slotId]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function SlotDetailPage() {
  return (
    <AuthWrapper>
      <SlotDetailContent />
    </AuthWrapper>
  );
}

function SlotDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slotId = params.slotId as string;

  const [slot, setSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Booking form state
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  useEffect(() => {
    fetchSlotDetails();
  }, [slotId]);

  useEffect(() => {
    if (startDate && startTime && endDate && endTime) {
      calculateCost();
    }
  }, [startDate, startTime, endDate, endTime]);

  const fetchSlotDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select(`
          *,
          owner:owner_id (
            full_name,
            name,
            unit_number,
            phone,
            email,
            viber_member,
            viber_nickname,
            viber_join_date,
            preferred_payment_note
          ),
          slot_rental_settings (*)
        `)
        .eq('slot_id', slotId)
        .single();

      if (error) throw error;
      setSlot(data);
    } catch (err) {
      console.error('Error fetching slot:', err);
      alert('Slot not found');
      router.push('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const calculateCost = async () => {
    if (!startDate || !endDate || !startTime || !endTime) return;

    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      if (end <= start) {
        setCalculatedCost(null);
        return;
      }

      const durationMs = end.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationDays = durationHours / 24;

      let cost = 0;

      if (durationHours < 24) {
        // Use hourly rate
        cost = slot.rental_rate_hourly * durationHours;
      } else {
        // Compare daily vs hourly
        const dailyCost = slot.rental_rate_daily * durationDays;
        const hourlyCost = slot.rental_rate_hourly * durationHours;
        cost = Math.min(dailyCost, hourlyCost);
      }

      setCalculatedCost(Math.round(cost * 100) / 100);
    } catch (err) {
      console.error('Error calculating cost:', err);
      setCalculatedCost(null);
    }
  };

  const handleBooking = async () => {
    if (!startDate || !endDate || !startTime || !endTime) {
      alert('Please select start and end date/time');
      return;
    }

    if (calculatedCost === null || calculatedCost <= 0) {
      alert('Invalid booking duration');
      return;
    }

    setBookingLoading(true);

    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);

      // Check for overlapping bookings
      const { data: overlaps, error: overlapError } = await supabase
        .from('bookings')
        .select('booking_id')
        .eq('slot_id', slotId)
        .eq('status', 'confirmed')
        .or(`start_time.lte.${end.toISOString()},end_time.gte.${start.toISOString()}`);

      if (overlapError) throw overlapError;

      if (overlaps && overlaps.length > 0) {
        alert('This slot is already booked for the selected time period');
        setBookingLoading(false);
        return;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          user_id: user!.id,
          slot_id: parseInt(slotId),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: 'confirmed',
          total_amount: calculatedCost,
          hourly_rate: slot.rental_rate_hourly,
          payment_status: 'pending',
        }])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create earnings record
      const platformFee = calculatedCost * 0.10; // 10% platform fee
      const ownerPayout = calculatedCost - platformFee;

      const { error: earningsError } = await supabase
        .from('slot_earnings')
        .insert([{
          slot_id: parseInt(slotId),
          owner_id: slot.owner_id,
          booking_id: booking.booking_id,
          amount: calculatedCost,
          platform_fee: platformFee,
          owner_payout: ownerPayout,
          payment_status: 'pending',
        }]);

      if (earningsError) console.error('Error creating earnings record:', earningsError);

      alert('🎉 Booking confirmed! Check your bookings page.');
      router.push('/bookings');
    } catch (err: any) {
      console.error('Booking error:', err);
      alert('Error creating booking: ' + err.message);
    } finally {
      setBookingLoading(false);
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

  if (!slot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Slot Not Found</h2>
          <Link href="/marketplace" className="text-blue-600 hover:underline">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-6xl mx-auto py-8 px-4">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/marketplace" className="text-blue-600 hover:underline text-sm">
            ← Back to Marketplace
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Slot Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Viber Trust Signal */}
            {slot.owner?.viber_member && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-green-800">
                      ✓ Verified LMR Parking Member
                    </span>
                    <p className="text-sm text-green-600 mt-1">
                      {slot.owner.viber_nickname || slot.owner.full_name || slot.owner.name}
                      {slot.owner.viber_join_date &&
                        ` • Member since ${new Date(slot.owner.viber_join_date).toLocaleDateString('en-PH')}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {slot.unique_identifier || `Slot ${slot.slot_number}`}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                      {slot.slot_type === 'covered' ? '🏠 Covered' : '☀️ Uncovered'}
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Available
                    </span>
                  </div>
                </div>
              </div>

              {/* Clear Location Info */}
              {(slot.building_tower || slot.floor_level) && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold mb-2">📍 Exact Location</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {slot.building_tower && <div>Tower: <strong>{slot.building_tower}</strong></div>}
                    {slot.floor_level && <div>Floor: <strong>{slot.floor_level}</strong></div>}
                    {slot.unique_identifier && <div>Slot ID: <strong>{slot.unique_identifier}</strong></div>}
                    <div>Type: <strong className="capitalize">{slot.slot_type}</strong></div>
                  </div>
                  {slot.location_tags && slot.location_tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {slot.location_tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-1 bg-white rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {slot.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{slot.description}</p>
                </div>
              )}

              {/* Pricing */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Pricing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Hourly Rate</div>
                    <div className="text-3xl font-bold text-blue-600">
                      ₱{slot.rental_rate_hourly}
                    </div>
                    <div className="text-xs text-gray-500">per hour</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Daily Rate</div>
                    <div className="text-3xl font-bold text-purple-600">
                      ₱{slot.rental_rate_daily}
                    </div>
                    <div className="text-xs text-gray-500">per day (24 hours)</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    💡 <strong>Auto-Best Rate:</strong> You'll automatically get the best rate
                    (hourly vs daily) for your booking duration
                  </p>
                </div>
              </div>

              {/* Owner Instructions */}
              {slot.owner_notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <span>⚠️</span>
                    Important Instructions from Owner
                  </h3>
                  <p className="text-yellow-800 whitespace-pre-wrap">{slot.owner_notes}</p>
                </div>
              )}

              {/* Payment Instructions - No PM Needed */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">💰 Payment Method</h3>
                <p className="text-sm">
                  {slot.owner?.preferred_payment_note ||
                   'GCash/Maya/Cash - coordinate after booking confirmation'}
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Note: Payment is handled directly with owner, just like in Viber
                </p>
              </div>

              {/* Owner Info */}
              {slot.owner && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Slot Owner</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">👤</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{slot.owner.full_name || slot.owner.name}</div>
                      <div className="text-sm text-gray-600">Unit {slot.owner.unit_number}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-4">
              {/* Zero PM Booking Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-1">🎯 Book Without PM!</h3>
                <p className="text-xs text-blue-700">
                  All details are here. No need to message "Is this available?" - just book directly!
                </p>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">Book This Slot</h2>

              <form onSubmit={(e) => { e.preventDefault(); handleBooking(); }} className="space-y-4">
                {/* Start Date/Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* End Date/Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Cost Display */}
                {calculatedCost !== null && calculatedCost > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Total Cost:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₱{calculatedCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Duration: {(() => {
                        const start = new Date(`${startDate}T${startTime}`);
                        const end = new Date(`${endDate}T${endTime}`);
                        const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
                        return hours < 24 ? `${hours} hours` : `${Math.round(hours / 24 * 10) / 10} days`;
                      })()}
                    </div>
                  </div>
                )}

                {/* Book Button */}
                <button
                  type="submit"
                  disabled={bookingLoading || calculatedCost === null || calculatedCost <= 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {bookingLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  By booking, you agree to the slot owner's terms and ParkBoard's policies
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}