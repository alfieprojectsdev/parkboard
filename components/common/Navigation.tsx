// components/common/Navigation.tsx - Navigation bar with sign out
'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthWrapper'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function Navigation() {
  const { profile } = useAuth()
  const supabase = createClient()

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        return
      }
      // AuthWrapper will handle redirect via onAuthStateChange
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/slots" className="text-xl font-bold text-blue-600">
              ParkBoard
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/slots"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Browse Slots
              </Link>
              <Link
                href="/slots/new"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                List My Slot
              </Link>
              <Link
                href="/bookings"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                My Bookings
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {profile && (
              <div className="text-sm text-gray-700">
                <span className="font-medium">{profile.name}</span>
                <span className="text-gray-500 ml-2">Unit {profile.unit_number}</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}