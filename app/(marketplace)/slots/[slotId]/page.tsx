// app/(marketplace)/slots/[slotId]/page.tsx - Slot detail & booking
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthWrapper'
import AuthWrapper from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

interface SlotDetails {
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

function BookSlotContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const slotId = params.slotId as string

  const [slot, setSlot] = useState<SlotDetails | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [totalPrice, setTotalPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ============================================================================
  // FETCH SLOT DETAILS
  // ============================================================================

  useEffect(() => {
    async function fetchSlot() {
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
          .eq('slot_id', slotId)
          .single()

        if (fetchError) throw fetchError

        if (data.status !== 'active') {
          throw new Error('This slot is not available for booking')
        }

        setSlot(data)
      } catch (err: any) {
        console.error('Error fetching slot:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSlot()
  }, [slotId, supabase])

  // ============================================================================
  // CALCULATE PRICE (Live Update for Display Only)
  // ============================================================================

  useEffect(() => {
    if (!startTime || !endTime || !slot) {
      setTotalPrice(0)
      return
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (end <= start) {
      setTotalPrice(0)
      return
    }

    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const price = hours * slot.price_per_hour

    setTotalPrice(Math.round(price * 100) / 100)
  }, [startTime, endTime, slot])

  // ============================================================================
  // SUBMIT BOOKING (WITHOUT total_price - DB trigger calculates it)
  // ============================================================================

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Validation
      const start = new Date(startTime)
      const end = new Date(endTime)

      if (end <= start) {
        throw new Error('End time must be after start time')
      }

      if (start < new Date()) {
        throw new Error('Start time must be in the future')
      }

      // Check for conflicts (optional - DB constraint will also catch this)
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('booking_id')
        .eq('slot_id', slotId)
        .eq('status', 'confirmed')
        .or(`start_time.lte.${endTime},end_time.gte.${startTime}`)

      if (conflicts && conflicts.length > 0) {
        throw new Error('Slot already booked for this time')
      }

      // Insert booking WITHOUT total_price (DB trigger will calculate)
      const { error: insertError } = await supabase
        .from('bookings')
        .insert({
          slot_id: parseInt(slotId),
          renter_id: user!.id,
          start_time: startTime,
          end_time: endTime,
          status: 'pending'
          // NO total_price - DB trigger calculates it server-side
        })

      if (insertError) throw insertError

      setSuccess(true)

      // Show success message then redirect
      setTimeout(() => {
        router.push('/bookings')
      }, 2000)

    } catch (err: any) {
      console.error('Booking error:', err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !slot) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          Error loading slot: {error}
        </Alert>
        <Button onClick={() => router.push('/slots')} className="mt-4">
          Back to Slots
        </Button>
      </div>
    )
  }

  if (!slot) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          Slot not found
        </Alert>
        <Button onClick={() => router.push('/slots')} className="mt-4">
          Back to Slots
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Book Parking Slot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slot Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Slot {slot.slot_number}</h3>
              <span className="text-blue-600 font-bold text-xl">
                ₱{slot.price_per_hour}/hr
              </span>
            </div>

            <div className="text-sm text-gray-600">
              <span className="font-medium">Type:</span>{' '}
              <span className="capitalize">{slot.slot_type || 'Standard'}</span>
            </div>

            {slot.description && (
              <p className="text-sm text-gray-600">{slot.description}</p>
            )}

            {slot.user_profiles && (
              <div className="pt-2 border-t text-sm text-gray-500">
                Owner: {slot.user_profiles.name} • {slot.user_profiles.phone}
              </div>
            )}
          </div>

          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              Booking created successfully! Redirecting to your bookings...
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          {/* Booking Form */}
          {!success && (
            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium mb-1">
                  Start Time
                </label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium mb-1">
                  End Time
                </label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>

              {/* Price Display (Client-side calculation for display only) */}
              {totalPrice > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Estimated Total:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₱{totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Final price will be calculated by the server
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/slots')}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting || !totalPrice}
                >
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function BookSlotPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <BookSlotContent />
    </AuthWrapper>
  )
}
