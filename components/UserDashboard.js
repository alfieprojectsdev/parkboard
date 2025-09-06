// =============================================================================
// UserDashboard.js - Main resident view with bookings and new booking flow
// =============================================================================

import { useState } from 'react';
import UserBookingsList from './UserBookingsList';
import BookingForm from './BookingForm';
import BookingConfirmation from './BookingConfirmation';
import { useAuth } from './AuthWrapper';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const { profile } = useAuth();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('bookings')}
        >
          My Bookings
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('new')}
        >
          New Booking
        </button>
      </div>

      {activeTab === 'bookings' && (
        <UserBookingsList userId={profile?.id} />
      )}

      {activeTab === 'new' && !bookingConfirmed && (
        <BookingForm
          onSuccess={setBookingConfirmed}
        />
      )}

      {bookingConfirmed && (
        <BookingConfirmation booking={bookingConfirmed} onDone={() => setBookingConfirmed(null)} />
      )}
    </div>
  );
}

