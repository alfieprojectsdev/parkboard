// =============================================================================
// UserDashboard.js - Main resident view with bookings and new booking flow
// =============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthWrapper';
import UserBookingsList from './UserBookingsList';
import TimeRangePicker from './TimeRangePicker';
import SlotGrid from './SlotGrid';
import BookingForm from './BookingForm';

export default function UserDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookingFlow, setBookingFlow] = useState({
    step: 'time', // 'time' -> 'slots' -> 'form' -> 'confirmation'
    timeRange: null,
    selectedSlot: null,
    booking: null
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTimeRangeSelect = (timeRange) => {
    setBookingFlow({
      ...bookingFlow,
      step: 'slots',
      timeRange
    });
  };

  const handleSlotSelect = (slot) => {
    setBookingFlow({
      ...bookingFlow,
      step: 'form',
      selectedSlot: slot
    });
  };

  const handleBookingSuccess = (booking) => {
    setBookingFlow({
      ...bookingFlow,
      step: 'confirmation',
      booking
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const resetBookingFlow = () => {
    setBookingFlow({
      step: 'time',
      timeRange: null,
      selectedSlot: null,
      booking: null
    });
    setActiveTab('bookings');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bookings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              My Bookings
            </button>
            <button
              onClick={() => setActiveTab('new-booking')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'new-booking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              New Booking
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'bookings' && (
        <UserBookingsList 
          userId={user.id} 
          refreshTrigger={refreshTrigger}
        />
      )}

      {activeTab === 'new-booking' && (
        <div className="space-y-6">
          {bookingFlow.step === 'time' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Select Booking Time</h2>
              <TimeRangePicker onTimeRangeSelect={handleTimeRangeSelect} />
            </div>
          )}

          {bookingFlow.step === 'slots' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Available Slots</h2>
                <button
                  onClick={() => setBookingFlow({...bookingFlow, step: 'time'})}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Change Time
                </button>
              </div>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800">
                  Selected time: {new Date(bookingFlow.timeRange.start).toLocaleString()} - {new Date(bookingFlow.timeRange.end).toLocaleString()}
                </p>
              </div>
              <SlotGrid
                selectedTimeRange={bookingFlow.timeRange}
                onSlotSelect={handleSlotSelect}
                refreshTrigger={refreshTrigger}
              />
            </div>
          )}

          {bookingFlow.step === 'form' && (
            <BookingForm
              selectedSlot={bookingFlow.selectedSlot}
              onSuccess={handleBookingSuccess}
              onCancel={() => setBookingFlow({...bookingFlow, step: 'slots'})}
            />
          )}

          {bookingFlow.step === 'confirmation' && (
            <BookingConfirmation
              booking={bookingFlow.booking}
              onDone={resetBookingFlow}
            />
          )}
        </div>
      )}
    </div>
  );
}

