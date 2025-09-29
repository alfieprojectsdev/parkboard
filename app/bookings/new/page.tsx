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