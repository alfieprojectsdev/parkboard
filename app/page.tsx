// app/page.tsx - Simplified Landing Page (Minimal MVP)
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import AdBanner from '@/components/advertising/AdBanner'
import DevModeBanner from '@/components/auth/DevModeBanner'
import DevUserSelector from '@/components/auth/DevUserSelector'
import { getDevUserForMiddleware } from '@/lib/auth/dev-session'
import { cookies } from 'next/headers'

/**
 * Landing Page - Minimal MVP Version
 *
 * Simplified from 476 lines to ~40 lines (92% reduction)
 * - Removed fake testimonials, pricing cards, multi-community selector
 * - Community-focused messaging for LMR residents
 * - Two clear actions: Browse slots or Post slot
 */
export default async function Home() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Check for dev session (server-side)
  const cookieStore = await cookies()
  const devSessionCookie = cookieStore.get('parkboard_dev_session')?.value
  const devUser = getDevUserForMiddleware(devSessionCookie)

  // User is authenticated if either Supabase session OR dev session exists
  const isAuthenticated = !!(session || devUser)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dev mode warning banner */}
      <DevModeBanner />

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">LMR Parking</h1>
          <p className="text-gray-600">Lumiere Residences community parking board</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        {/* Dev mode user selector (only shows in dev mode) */}
        <div className="mb-8">
          <DevUserSelector />
        </div>
        {/* Header Banner - Supporting LMR Community Businesses */}
        <div className="mb-8">
          <AdBanner placement="header" />
        </div>

        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Stop the Viber chaos. Post slots here instead.
        </h2>
        <p className="text-gray-600 mb-8">
          Simple parking slot sharing for LMR neighbors.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/LMR/slots">
            <Button size="lg">Browse Available Slots</Button>
          </Link>
          {isAuthenticated && (
            <Link href="/LMR/slots/new">
              <Button size="lg" variant="outline">Post My Slot</Button>
            </Link>
          )}
        </div>

        {/* Inline Banner - Mid-page placement */}
        <div className="mt-12">
          <AdBanner placement="inline" />
        </div>

        <div className="mt-16 text-sm text-gray-500">
          <p>Built for LMR residents, by an LMR resident.</p>
          <p className="mt-2">Questions? Email alfieprojects.dev@gmail.com</p>
        </div>
      </main>
    </div>
  )
}
