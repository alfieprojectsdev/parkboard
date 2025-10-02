// app/dashboard/page.tsx - Smart routing based on user type
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  );
}

function DashboardContent() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'owner' | 'renter' | 'both' | null>(null);
  const [stats, setStats] = useState({
    ownedSlots: 0,
    activeBookings: 0,
    listedSlots: 0,
  });

  useEffect(() => {
    if (user && profile) {
      determineUserType();
    }
  }, [user, profile]);

  const determineUserType = async () => {
    setLoading(true);
    try {
      // Check if user owns any slots
      const { data: ownedSlots, error: slotsError } = await supabase
        .from('parking_slots')
        .select('slot_id, is_listed_for_rent')
        .eq('owner_id', user!.id);

      if (slotsError) throw slotsError;

      const hasOwnedSlots = ownedSlots && ownedSlots.length > 0;
      const listedCount = ownedSlots?.filter(s => s.is_listed_for_rent).length || 0;

      // Check if user has made any bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_id')
        .eq('user_id', user!.id);

      if (bookingsError) throw bookingsError;

      const hasBookings = bookings && bookings.length > 0;

      setStats({
        ownedSlots: ownedSlots?.length || 0,
        activeBookings: bookings?.length || 0,
        listedSlots: listedCount,
      });

      // Determine user type
      if (hasOwnedSlots && hasBookings) {
        setUserType('both');
      } else if (hasOwnedSlots) {
        setUserType('owner');
      } else {
        setUserType('renter');
      }
    } catch (err) {
      console.error('Error determining user type:', err);
      setUserType('renter'); // Default to renter
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-8 px-4">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {profile?.name}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Unit {profile?.unit_number}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {userType === 'owner' || userType === 'both' ? (
            <>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">My Slots</div>
                <div className="text-4xl font-bold mb-2">{stats.ownedSlots}</div>
                <div className="text-sm opacity-90">{stats.listedSlots} listed for rent</div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">As Renter</div>
                <div className="text-4xl font-bold mb-2">{stats.activeBookings}</div>
                <div className="text-sm opacity-90">Active bookings</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">Quick Action</div>
                <Link href="/marketplace" className="inline-block mt-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Browse Slots
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">My Bookings</div>
                <div className="text-4xl font-bold mb-2">{stats.activeBookings}</div>
                <div className="text-sm opacity-90">Total bookings made</div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">Available Slots</div>
                <Link href="/marketplace" className="inline-block mt-2 px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Browse Now
                </Link>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
                <div className="text-sm opacity-90 mb-1">Own a Slot?</div>
                <Link href="/owner/setup" className="inline-block mt-2 px-4 py-2 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  List It Here
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Browse Marketplace */}
            <Link
              href="/marketplace"
              className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all group"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Browse Slots</h3>
              <p className="text-sm text-gray-600 text-center">Find available parking</p>
            </Link>

            {/* My Bookings */}
            <Link
              href="/bookings"
              className="flex flex-col items-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200 hover:border-green-400 transition-all group"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📅</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">My Bookings</h3>
              <p className="text-sm text-gray-600 text-center">View reservations</p>
            </Link>

            {/* Owner Dashboard (if applicable) */}
            {(userType === 'owner' || userType === 'both') && (
              <Link
                href="/owner"
                className="flex flex-col items-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200 hover:border-yellow-400 transition-all group"
              >
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">💰</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">My Slots</h3>
                <p className="text-sm text-gray-600 text-center">Manage listings</p>
              </Link>
            )}

            {/* List Your Slot */}
            {userType !== 'owner' && userType !== 'both' && (
              <Link
                href="/owner/setup"
                className="flex flex-col items-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all group"
              >
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">➕</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">List Your Slot</h3>
                <p className="text-sm text-gray-600 text-center">Start earning</p>
              </Link>
            )}

            {/* Admin (if applicable) */}
            {profile?.role === 'admin' && (
              <Link
                href="/admin"
                className="flex flex-col items-center p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 hover:border-red-400 transition-all group"
              >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">⚙️</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Admin Panel</h3>
                <p className="text-sm text-gray-600 text-center">Manage platform</p>
              </Link>
            )}
          </div>
        </div>

        {/* Info Banner - Different for Owner vs Renter */}
        {userType === 'renter' ? (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💡</span>
              </div>
              <div>
                <h3 className="font-semibold text-green-900 mb-2">
                  Own a parking slot? Start earning passive income!
                </h3>
                <p className="text-sm text-green-800 mb-4">
                  List your slot on ParkBoard and earn money when you're not using it. 
                  You control the pricing and availability.
                </p>
                <Link
                  href="/owner/setup"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <span>List My Slot</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  You're an active slot owner!
                </h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Your slots are {stats.listedSlots > 0 ? 'listed and earning' : 'ready to list'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Manage pricing and availability anytime</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Track your earnings in real-time</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}