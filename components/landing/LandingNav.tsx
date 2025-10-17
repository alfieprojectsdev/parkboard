// components/landing/LandingNav.tsx
'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface LandingNavProps {
  profile: {
    name: string
    unit_number: string
  } | null
}

/**
 * Landing Page Navigation - Client Component
 *
 * Why Client Component?
 * - Needs interactivity (Sign Out button onClick)
 * - Receives pre-fetched auth state from server component (no network delay)
 *
 * Pattern: Server Component fetches data → passes to Client Component for interactivity
 * This is the recommended Next.js pattern for auth state
 */
export default function LandingNav({ profile }: LandingNavProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.refresh() // Refresh server data to pick up signed-out state
  }

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">🅿️</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">ParkBoard</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile ? (
              <>
                <div className="text-sm text-right">
                  <div className="font-medium">{profile.name}</div>
                  <div className="text-gray-500">Unit {profile.unit_number}</div>
                </div>
                <Button variant="ghost" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
