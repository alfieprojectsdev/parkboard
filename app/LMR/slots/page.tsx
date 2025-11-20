// app/LMR/slots/page.tsx - Browse slots (Minimal MVP)
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navigation from '@/components/common/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

/**
 * Browse Slots - Minimal MVP Version
 *
 * Displays available parking slots with:
 * - Location (level, tower, landmark)
 * - Time window (available from/until)
 * - Status (available/taken/expired)
 * - Owner contact info
 */

interface Slot {
  id: string
  location_level: string
  location_tower: string
  location_landmark: string | null
  available_from: string
  available_until: string
  status: string
  notes: string | null
  owner_id: string
  user_profiles: {
    name: string
    phone: string | null
  }[]
}

function SlotsContent() {
  const supabase = createClient()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSlots() {
      try {
        const { data, error: fetchError } = await supabase
          .from('parking_slots')
          .select(`
            id,
            location_level,
            location_tower,
            location_landmark,
            available_from,
            available_until,
            status,
            notes,
            owner_id,
            user_profiles (
              name,
              phone
            )
          `)
          .eq('status', 'available')
          .order('available_from', { ascending: true })

        if (fetchError) throw fetchError

        setSlots(data || [])
      } catch (err: unknown) {
        const error = err as Error
        console.error('Error fetching slots:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount. supabase is a stable client.

  // Helper function to format date/time
  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString()

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    if (isToday) return `Today ${timeStr}`
    if (isTomorrow) return `Tomorrow ${timeStr}`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  }

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
        <Link href="/LMR/slots/new">
          <Button>Post Your Slot</Button>
        </Link>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No slots available yet.</p>
          <Link href="/LMR/slots/new">
            <Button>Be the first to post one!</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map(slot => (
            <Card key={slot.id} className="hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-bold">{slot.location_level} {slot.location_tower}</div>
                    {slot.location_landmark && (
                      <div className="text-sm font-normal text-gray-600 mt-1">
                        {slot.location_landmark}
                      </div>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Available
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {/* Time Window */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">📅</span>
                      <div className="flex-1">
                        <div className="text-xs text-gray-600 mb-1">Available:</div>
                        <div className="font-medium text-gray-900">{formatDateTime(slot.available_from)}</div>
                        <div className="text-xs text-gray-600 mt-1">Until:</div>
                        <div className="font-medium text-gray-900">{formatDateTime(slot.available_until)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {slot.notes && (
                    <p className="text-gray-600 text-xs line-clamp-2 italic">
                      &quot;{slot.notes}&quot;
                    </p>
                  )}

                  {/* Owner Info */}
                  {slot.user_profiles && slot.user_profiles.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        Posted by: <span className="font-medium">{slot.user_profiles[0].name}</span>
                      </p>
                      {slot.user_profiles[0].phone && (
                        <p className="text-xs text-gray-500 mt-1">
                          Contact: <span className="font-medium">{slot.user_profiles[0].phone}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Contact Button */}
                  <Button className="w-full mt-3" size="sm" variant="outline">
                    Contact Owner
                  </Button>
                </div>
              </CardContent>
            </Card>
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
