// app/donations/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/common/Navigation';
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper';
import DonationForm from '@/components/donations/DonationForm';
import DonationsList from '@/components/donations/DonationsList';
import { getUserDonations, getDonationStats, Donation } from '@/lib/donations';

export default function DonationsPage() {
  return (
    <AuthWrapper>
      <DonationsContent />
    </AuthWrapper>
  );
}

function DonationsContent() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState({ total: 0, count: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'donate' | 'history'>('donate');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [donationsData, statsData] = await Promise.all([
        getUserDonations(),
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

  const handleDonationSuccess = () => {
    fetchData();
    setActiveTab('history');
    // Show success message
    alert('Thank you for your donation!');
  };

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
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Community Donations</h1>
          <p className="text-gray-600 mt-2">
            Support our building and community initiatives
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">Total Donated (Community)</div>
            <div className="text-3xl font-bold text-purple-600">
              ₱{stats.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">Your Contributions</div>
            <div className="text-3xl font-bold text-green-600">
              {donations.filter(d => d.status === 'completed').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">Your Total</div>
            <div className="text-3xl font-bold text-blue-600">
              ₱{donations
                .filter(d => d.status === 'completed')
                .reduce((sum, d) => sum + Number(d.amount), 0)
                .toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {['donate', 'history'].map((tab) => (
              <button
                key={tab}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab as any)}
              >
                {tab === 'donate' ? 'Make a Donation' : 'Donation History'}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {activeTab === 'donate' ? (
            <>
              <div className="lg:col-span-2">
                <DonationForm userId={user!.id} onSuccess={handleDonationSuccess} />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">How Your Donations Help</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="mr-2">🏢</span>
                    <span><strong>Maintenance:</strong> Building repairs and upgrades</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">🎉</span>
                    <span><strong>Community:</strong> Events and activities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">🚨</span>
                    <span><strong>Emergency:</strong> Urgent repairs and needs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">💡</span>
                    <span><strong>General:</strong> Day-to-day operations</span>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="lg:col-span-3">
              <DonationsList donations={donations} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}