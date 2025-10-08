// app/(marketplace)/slots/page.tsx - Browse slots (already existed, not edited)
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthWrapper from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Slot {
  slot_id: number
  slot_number: string
  slot_type: string
  description: string | null
  price_per_hour: number
  status: string
  user_profiles: {
    name: string
    phone: string
  } | null
}

function SlotsContent() {
  const supabase = createClient()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // TASK 1: Fetch Available Slots
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

        setSlots(data || [])
      } catch (err: any) {
        console.error('Error fetching slots:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }, [supabase])

  // ============================================================================
  // TASK 2: Render Slot Cards
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
        <Link href="/slots/new">
          <Button>List Your Slot</Button>
        </Link>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No slots available yet.</p>
          <Link href="/slots/new">
            <Button>Be the first to list one!</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map(slot => (
            <Link key={slot.slot_id} href={`/slots/${slot.slot_id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-xl">Slot {slot.slot_number}</span>
                    <span className="text-blue-600 text-lg">
                      ₱{slot.price_per_hour}/hr
                    </span>
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

                    <Button className="w-full mt-3" size="sm">
                      Book Now
                    </Button>
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
  return (
    <AuthWrapper>
      <Navigation />
      <SlotsContent />
    </AuthWrapper>
  )
}