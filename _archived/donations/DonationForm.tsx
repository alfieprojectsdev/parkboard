// components/donations/DonationForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createDonation } from '@/lib/donations';

interface DonationFormProps {
  userId: string;
  onSuccess: () => void;
}

export default function DonationForm({ userId, onSuccess }: DonationFormProps) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [donationType, setDonationType] = useState<'general' | 'maintenance' | 'community' | 'emergency'>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const presetAmounts = [50, 100, 250, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    try {
      await createDonation(
        {
          amount: amountNum,
          message: message.trim(),
          donation_type: donationType,
        },
        userId
      );

      // Reset form
      setAmount('');
      setMessage('');
      setDonationType('general');
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to process donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Donation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Donation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Donation Purpose
            </label>
            <select
              value={donationType}
              onChange={(e) => setDonationType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="general">General Fund</option>
              <option value="maintenance">Building Maintenance</option>
              <option value="community">Community Events</option>
              <option value="emergency">Emergency Fund</option>
            </select>
          </div>

          {/* Preset Amounts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Select Amount (PHP)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    amount === preset.toString()
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                  }`}
                >
                  ₱{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Enter Custom Amount (PHP)
            </label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message with your donation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/200 characters
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={loading || !amount}
          >
            {loading ? 'Processing...' : `Donate ₱${amount || '0'}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}