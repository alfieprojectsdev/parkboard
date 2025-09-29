// ===============================================================================
// app/bookings/page.tsx - Fixed bookings list page  
// ===============================================================================
"use client";

import Navigation from '@/components/common/Navigation';
import UserBookingsList from '../../components/UserBookingsList';
import AuthWrapper from '../../components/AuthWrapper';
import { useAuth } from '../../components/AuthWrapper';
import Link from 'next/link';

export default function BookingsPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
              <p className="text-gray-600 mt-2">Manage your parking reservations</p>
            </div>
            <Link 
              href="/bookings/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Booking
            </Link>
          </div>
          
          {profile ? (
            <UserBookingsList userId={profile.id} />
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600">Unable to load profile. Please refresh the page.</p>
            </div>
          )}
        </main>
      </div>
    </AuthWrapper>
  );
}