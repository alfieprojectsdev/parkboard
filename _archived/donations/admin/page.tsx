// app/admin/donations/page.tsx
"use client";

import { useState, useEffect } from 'react';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import DonationsList from '@/components/donations/DonationsList';
import { getAllDonations, getDonationStats, Donation } from '@/lib/donations';

export default function AdminDonationsPage() {
  return (
    <AuthWrapper>
      <AdminDonationsContent />
    </AuthWrapper>
  );
}

function AdminDonationsContent() {
  const { profile } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState({ total: 0, count: 0, byType: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [donationsData, statsData] = await Promise.all([
        getAllDonations(),
        getDonationStats()
      ]);
      setDonations(donationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Donations</h1>
          <p className="text-gray-600 mt-2">
            Community-wide donation history and statistics
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">Total Raised</div>
            <div className="text-3xl font-bold text-purple-600">
              ₱{stats.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">Total Donations</div>
            <div className="text-3xl font-bold text-blue-600">{stats.count}</div>
          </div>
          {Object.entries(stats.byType).map(([type, amount]) => (
            <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-500 mb-1 capitalize">{type}</div>
              <div className="text-2xl font-bold text-green-600">
                ₱{(amount as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>

        {/* Donations List */}
        <DonationsList donations={donations} showUser={true} />
      </main>
    </div>
  );
}