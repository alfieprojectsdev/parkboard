'use client'

import { useCommunity } from '@/lib/context/CommunityContext'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Community Landing Page
 * Entry point for each community (e.g., /LMR)
 *
 * Features:
 * - Welcome message with community branding
 * - Quick action cards for main features
 * - Mobile-friendly layout
 */
export default function CommunityHome() {
  const community = useCommunity()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Welcome to {community.displayName}
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-2">
            Park smarter with your neighbors
          </p>
          <p className="text-sm text-gray-500">
            Community Code: <span className="font-mono font-bold">{community.code}</span>
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Browse Slots */}
          <Card className="hover:shadow-xl transition-shadow border-2 hover:border-blue-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🅿️</span>
                <span>Browse Slots</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Find available parking slots from your neighbors
              </p>
              <Link href={`/${community.code}/slots`}>
                <Button className="w-full" size="lg">
                  View Available Slots
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* List Your Slot */}
          <Card className="hover:shadow-xl transition-shadow border-2 hover:border-green-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <span>List Your Slot</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Earn money by renting out your parking space
              </p>
              <Link href={`/${community.code}/slots/new`}>
                <Button className="w-full" size="lg" variant="outline">
                  List Your Slot
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* My Bookings */}
          <Card className="hover:shadow-xl transition-shadow border-2 hover:border-purple-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <span>My Bookings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                View and manage your parking reservations
              </p>
              <Link href={`/${community.code}/bookings`}>
                <Button className="w-full" size="lg" variant="outline">
                  View Bookings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-center text-2xl">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl mb-3">1️⃣</div>
                <h3 className="font-bold mb-2">Browse</h3>
                <p className="text-sm text-gray-700">
                  Find available parking slots in {community.name}
                </p>
              </div>
              <div>
                <div className="text-4xl mb-3">2️⃣</div>
                <h3 className="font-bold mb-2">Book</h3>
                <p className="text-sm text-gray-700">
                  Reserve instantly or request a quote from the owner
                </p>
              </div>
              <div>
                <div className="text-4xl mb-3">3️⃣</div>
                <h3 className="font-bold mb-2">Park</h3>
                <p className="text-sm text-gray-700">
                  Use your neighbor's slot when they're away
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Community Info */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            ParkBoard is a community-driven parking marketplace exclusively for {community.displayName} residents.
          </p>
          <p className="mt-2">
            Need help? Contact your building management.
          </p>
        </div>
      </div>
    </div>
  )
}
