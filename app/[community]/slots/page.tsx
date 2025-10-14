// app/[community]/slots/page.tsx - Browse slots (HYBRID PRICING + MULTI-TENANT)
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCommunity } from '@/lib/context/CommunityContext'
import Navigation from '@/components/common/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Slot {
  slot_id: number
  slot_number: string
  slot_type: string
  description: string | null
  price_per_hour: number | null  // NEW: Can be NULL for Request Quote
  status: string
  user_profiles: {
    name: string
    phone: string
  } | null
}

function SlotsContent() {
  const community = useCommunity()
  const supabase = createClient()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // TASK 1: Fetch Available Slots (unchanged - query handles NULL prices)
  // ============================================================================

  useEffect(() => {
    async function fetchSlots() {
      try {
        const { data, error: fetchError } = await supabase
          .from('parking_slots')
          .select(`
            slot_id,
            slot_number,
            slot_type,
            description,
            price_per_hour,
            status,
            user_profiles (
              name,
              phone
            )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        // NEW: Optional client-side ranking (boost explicit pricing)
        const rankedSlots = (data || []).sort((a, b) => {
          // Slots with explicit pricing appear first
          const aScore = a.price_per_hour ? 1 : 0.7
          const bScore = b.price_per_hour ? 1 : 0.7
          return bScore - aScore
        })

        setSlots(rankedSlots)
      } catch (err: unknown) {
        const error = err as Error
        console.error('Error fetching slots:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }, []) // Run once on mount

  // ============================================================================
  // TASK 2: Render Slot Cards (Updated with conditional pricing display)
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error loading slots: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Parking Slots</h1>
        <Link href={`/${community.code}/slots/new`}>
          <Button>List Your Slot</Button>
        </Link>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No slots available yet.</p>
          <Link href={`/${community.code}/slots/new`}>
            <Button>Be the first to list one!</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map(slot => (
            <Link key={slot.slot_id} href={`/${community.code}/slots/${slot.slot_id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="text-xl">Slot {slot.slot_number}</span>

                    {/* NEW: Conditional pricing display */}
                    <div className="text-right">
                      {slot.price_per_hour ? (
                        <>
                          <span className="text-blue-600 text-lg font-bold">
                            ₱{slot.price_per_hour}/hr
                          </span>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              ✓ Instant Booking
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-700 text-sm font-medium">
                            Request Quote
                          </span>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Contact Owner
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium mr-2">Type:</span>
                      <span className="capitalize">{slot.slot_type || 'Standard'}</span>
                    </div>

                    {slot.description && (
                      <p className="text-gray-600 line-clamp-2">
                        {slot.description}
                      </p>
                    )}

                    {slot.user_profiles && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">
                          Owner: {slot.user_profiles.name}
                        </p>
                      </div>
                    )}

                    {/* NEW: Conditional button text */}
                    {slot.price_per_hour ? (
                      <Button className="w-full mt-3" size="sm">
                        Book Now
                      </Button>
                    ) : (
                      <Button className="w-full mt-3" size="sm" variant="outline">
                        View Details
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SlotsPage() {
  // 🆕 PUBLIC PAGE: No AuthWrapper needed
  // This page is public per middleware configuration (line 155-158 in middleware.ts)
  // Users can browse slots without logging in
  // Auth is only required for actions (booking, creating slots)
  return (
    <>
      <Navigation />
      <SlotsContent />
    </>
  )
}
