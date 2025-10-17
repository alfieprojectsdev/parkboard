// components/common/Navigation.tsx - Navigation bar (MULTI-TENANT)
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useOptionalAuth } from '@/components/auth/AuthWrapper'
import { useCommunity } from '@/lib/context/CommunityContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { UserProfile } from '@/types/database'

export default function Navigation() {
  const community = useCommunity()
  const auth = useOptionalAuth() // null on public pages without AuthWrapper
  const supabase = createClient()

  // State for auth when not wrapped in AuthWrapper (public pages)
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null)

  // Use auth from context if available, otherwise use local state
  const profile = auth?.profile || localProfile

  // Fetch auth state directly if not provided by AuthWrapper
  // CRITICAL: Empty dependency array [] to avoid infinite loops
  // (supabase object reference changes every render)
  useEffect(() => {
    // If AuthWrapper provides auth, don't fetch locally
    if (auth) {
      return
    }

    async function checkLocalAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setLocalProfile(profileData)
        }
      } catch (err) {
        console.error('Navigation auth check error:', err)
      }
    }

    checkLocalAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setLocalProfile(null)
        } else if (event === 'SIGNED_IN' && session) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setLocalProfile(profileData)
        }
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount - auth and supabase are stable refs

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        return
      }
      // Redirect to login after sign out
      window.location.href = '/login'
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href={`/${community.code}`} className="text-xl font-bold text-blue-600">
              ParkBoard
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              <Link
                href={`/${community.code}/slots`}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Browse Slots
              </Link>
              <Link
                href={`/${community.code}/slots/new`}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                List My Slot
              </Link>
              <Link
                href={`/${community.code}/bookings`}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                My Bookings
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {profile ? (
              // Logged in: Show profile + Sign Out
              <>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{profile.name}</span>
                  <span className="text-gray-500 ml-2">Unit {profile.unit_number}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              // Not logged in: Show Login + Register (public page)
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}