// app/owner/earnings/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import Link from 'next/link';

export default function EarningsPage() {
  return (
    <AuthWrapper>
      <EarningsContent />
    </AuthWrapper>
  );
}

function EarningsContent() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    if (user) {
      fetchEarnings();
    }
  }, [user, filter]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('slot_earnings')
        .select(`
          *,
          parking_slots (slot_number),
          bookings (start_time, end_time, user_profiles (name, unit_number))
        `)
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('payment_status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEarnings(data || []);

      // Calculate stats
      const total = data?.reduce((sum, e) => sum + Number(e.owner_payout), 0) || 0;
      const pending = data?.filter(e => e.payment_status === 'pending')
        .reduce((sum, e) => sum + Number(e.owner_payout), 0) || 0;
      const paid = data?.filter(e => e.payment_status === 'paid')
        .reduce((sum, e) => sum + Number(e.owner_payout), 0) || 0;

      // This month earnings
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = data?.filter(e => new Date(e.created_at) >= startOfMonth)
        .reduce((sum, e) => sum + Number(e.owner_payout), 0) || 0;

      setStats({
        totalEarnings: total,
        pendingPayouts: pending,
        completedPayouts: paid,
        thisMonth,
      });
    } catch (err) {
      console.error('Error fetching earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Track your rental income and payouts
            </p>
          </div>
          <Link
            href="/owner"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Owner Dashboard
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
            <div className="text-sm opacity-90 mb-1">Total Earnings</div>
            <div className="text-3xl font-bold">
              ₱{stats.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs opacity-90 mt-1">All-time</div>
          </div>
          
          <div className="bg-white border-2 border-green-200 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">This Month</div>
            <div className="text-3xl font-bold text-green-600">
              ₱{stats.thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">Current period</div>
          </div>
          
          <div className="bg-white border-2 border-yellow-200 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Pending</div>
            <div className="text-3xl font-bold text-yellow-600">
              ₱{stats.pendingPayouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">Awaiting payout</div>
          </div>
          
          <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
            <div className="text-sm text-gray-500 mb-1">Completed</div>
            <div className="text-3xl font-bold text-blue-600">
              ₱{stats.completedPayouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500 mt-1">Already paid</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'paid'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Paid
            </button>
          </div>
        </div>

        {/* Earnings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {earnings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Earnings Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Your earnings will appear here once your slots are booked
              </p>
              <Link
                href="/owner"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Manage My Slots
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Renter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Your Payout
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {earnings.map((earning) => (
                    <tr key={earning.earning_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(earning.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {earning.parking_slots?.slot_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {earning.bookings?.user_profiles?.name || 'N/A'}
                        <br />
                        <span className="text-xs text-gray-500">
                          Unit {earning.bookings?.user_profiles?.unit_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{Number(earning.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₱{Number(earning.platform_fee).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ₱{Number(earning.owner_payout).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          earning.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : earning.payment_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {earning.payment_status.charAt(0).toUpperCase() + earning.payment_status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <span>💡</span>
            About Payouts
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Earnings are calculated automatically when a booking is completed</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Platform fee is 10% of the booking amount</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Payouts are processed weekly (every Monday)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Pending earnings will be paid out in the next cycle</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}