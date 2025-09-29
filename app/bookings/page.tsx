"use client";

import { useAuth } from '@/components/auth/AuthWrapper';
import AuthWrapper from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import UserBookingsList from '@/components/booking/UserBookingsList';
import Link from 'next/link';

function BookingsContent() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">Manage your parking reservations</p>
        </div>
        <Link 
          href="/bookings/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Booking
        </Link>
      </div>
      
      {profile ? (
        <UserBookingsList userId={profile.id} />
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Unable to load profile. Please try refreshing the page.</p>
        </div>
      )}
    </main>
  );
}

export default function BookingsPage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <BookingsContent />
      </div>
    </AuthWrapper>
  );
}