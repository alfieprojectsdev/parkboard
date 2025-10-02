// components/donations/DonationsList.tsx
'use client';

import { Donation } from '@/lib/donations';

interface DonationsListProps {
  donations: Donation[];
  showUser?: boolean;
}

export default function DonationsList({ donations, showUser = false }: DonationsListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDonationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: 'General Fund',
      maintenance: 'Maintenance',
      community: 'Community',
      emergency: 'Emergency'
    };
    return labels[type] || type;
  };

  if (donations.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No donations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {donations.map((donation) => (
        <div
          key={donation.donation_id}
          className="border rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-2xl text-purple-600">
                  ₱{donation.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  donation.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : donation.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {donation.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-1 text-sm">
                {showUser && donation.user_profiles && (
                  <p className="text-gray-700">
                    <span className="font-medium">From:</span> {donation.user_profiles.name} (Unit {donation.user_profiles.unit_number})
                  </p>
                )}
                <p className="text-gray-600">
                  <span className="font-medium">Purpose:</span> {getDonationTypeLabel(donation.donation_type)}
                </p>
                {donation.message && (
                  <p className="text-gray-600 italic">
                    "{donation.message}"
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  {formatDate(donation.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}