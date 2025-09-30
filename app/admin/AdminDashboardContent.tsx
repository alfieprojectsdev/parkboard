// app/admin/AdminDashboardContent.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';

interface AuthContext {
  user: any;
  profile: any;
  loading: boolean;
}

export default function AdminDashboardContent() {
  const { profile } = useAuth() as AuthContext; 
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSlots: 0,
    activeBookings: 0,
    todayBookings: 0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch stats
      const [usersRes, slotsRes, bookingsRes] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('parking_slots').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*').eq('status', 'confirmed')
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayBookings = bookingsRes.data?.filter(booking => {
        const bookingDate = new Date(booking.start_time);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === today.getTime();
      }).length || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalSlots: slotsRes.count || 0,
        activeBookings: bookingsRes.data?.length || 0,
        todayBookings
      });

      // Fetch recent bookings - simplified to avoid errors
      const { data: recentData, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_id, user_id, slot_id, start_time, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (bookingsError) {
        console.error('Bookings fetch error:', bookingsError);
        setRecentBookings([]);
      } else if (recentData && recentData.length > 0) {
        // Fetch related user and slot data separately
        const userIds = [...new Set(recentData.map(b => b.user_id))];
        const slotIds = [...new Set(recentData.map(b => b.slot_id))];

        const [usersRes, slotsRes] = await Promise.all([
          supabase.from('user_profiles').select('id, name, unit_number').in('id', userIds),
          supabase.from('parking_slots').select('slot_id, slot_number, slot_type').in('slot_id', slotIds)
        ]);

        // Merge the data
        const enrichedBookings = recentData.map(booking => ({
          ...booking,
          user_profiles: usersRes.data?.find(u => u.id === booking.user_id),
          parking_slots: slotsRes.data?.find(s => s.slot_id === booking.slot_id)
        }));

        setRecentBookings(enrichedBookings);
      } else {
        setRecentBookings([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Total Slots</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSlots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Active Bookings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">Today's Bookings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.todayBookings}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid: Recent Bookings + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              <Link 
                href="/admin/bookings-manage"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <div key={booking.booking_id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {booking.user_profiles?.name || 'Unknown'} - Unit {booking.user_profiles?.unit_number || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Slot {booking.parking_slots?.slot_number || 'N/A'} • {new Date(booking.start_time).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No recent bookings</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Management</h2>
            <div className="space-y-3">
              <Link 
                href="/admin/bookings-manage"
                className="flex items-center justify-between w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200 group"
              >
                <span className="font-medium">📋 Manage All Bookings</span>
                <svg className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link 
                href="/admin/slots"
                className="flex items-center justify-between w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 group"
              >
                <span className="font-medium">🅿️ Manage Parking Slots</span>
                <svg className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link 
                href="/admin/users"
                className="flex items-center justify-between w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200 group"
              >
                <span className="font-medium">👥 Manage Users</span>
                <svg className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}