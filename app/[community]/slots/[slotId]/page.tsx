// app/[community]/slots/[slotId]/page.tsx - Slot detail & booking (HYBRID PRICING + MULTI-TENANT)
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCommunity } from '@/lib/context/CommunityContext'
import { useAuth } from '@/components/auth/AuthWrapper'
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
  price_per_hour: number | null  // NEW: Can be NULL for Request Quote
  status: string
  owner_id: string  // NEW: For ownership check
  user_profiles: {
    name: string
    phone: string
  } | null
}

function BookSlotContent() {
  const community = useCommunity()
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
  // FETCH SLOT DETAILS (unchanged - query handles NULL prices)
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
            owner_id,
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

        // Type assertion needed because Supabase joins return proper structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSlot(data as any)
      } catch (err: unknown) {
        const error = err as Error
        console.error('Error fetching slot:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSlot()
  }, [slotId]) // slotId is stable from params

  // ============================================================================
  // CALCULATE PRICE (Updated - only for slots with explicit pricing)
  // ============================================================================

  useEffect(() => {
    // NEW: Skip calculation if slot has no explicit price
    if (!startTime || !endTime || !slot || !slot.price_per_hour) {
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
  // SUBMIT BOOKING (unchanged - DB trigger will block NULL price slots)
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
        router.push(`/${community.code}/bookings`)
      }, 2000)

    } catch (err: unknown) {
      const error = err as Error
      console.error('Booking error:', error)
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================================
  // RENDER (Updated with conditional booking form)
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
        <Button onClick={() => router.push(`/${community.code}/slots`)} className="mt-4">
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
        <Button onClick={() => router.push(`/${community.code}/slots`)} className="mt-4">
          Back to Slots
        </Button>
      </div>
    )
  }

  // NEW: Determine if this is a Request Quote slot
  const isRequestQuote = !slot.price_per_hour

  // NEW: Check if current user is the owner
  const isOwner = user?.id === slot.owner_id

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl">
              {isRequestQuote ? 'Contact Owner for Booking' : 'Book Parking Slot'}
            </CardTitle>
            {/* NEW: Edit button for owners */}
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/${community.code}/slots/${slotId}/edit`)}
              >
                ✏️ Edit Slot
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slot Details (Updated with conditional pricing display) */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold">Slot {slot.slot_number}</h3>

              {/* NEW: Conditional pricing display */}
              {slot.price_per_hour ? (
                <div className="text-right">
                  <span className="text-blue-600 font-bold text-xl">
                    ₱{slot.price_per_hour}/hr
                  </span>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      ✓ Instant Booking
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-right">
                  <div className="text-gray-700 font-medium">Price on Request</div>
                  <div className="text-sm text-gray-500">Contact owner for rates</div>
                </div>
              )}
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

          {/* NEW: Conditional rendering - Booking Form vs Contact Owner */}
          {!success && (
            <>
              {slot.price_per_hour ? (
                // INSTANT BOOKING FORM (Explicit Pricing)
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
                      onClick={() => router.push(`/${community.code}/slots`)}
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
              ) : (
                // CONTACT OWNER FLOW (Request Quote)
                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 text-lg">ℹ️</span>
                      <div>
                        <strong className="text-gray-900">Request Quote Required</strong>
                        <p className="text-sm text-gray-700 mt-1">
                          This slot requires contacting the owner to discuss pricing, availability,
                          and booking arrangements. The owner will provide you with rates and help
                          you schedule your parking.
                        </p>
                      </div>
                    </div>
                  </Alert>

                  {slot.user_profiles && (
                    <Card className="bg-white border-2 border-blue-200">
                      <CardContent className="pt-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Owner Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{slot.user_profiles.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">{slot.user_profiles.phone}</span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <Button
                            className="w-full"
                            onClick={() => window.location.href = `tel:${slot.user_profiles?.phone}`}
                          >
                            📞 Call Owner
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.location.href = `sms:${slot.user_profiles?.phone}`}
                          >
                            💬 Send SMS
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/${community.code}/slots`)}
                      className="w-full"
                    >
                      ← Back to Slot Listings
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function BookSlotPage() {
  return (
    <>
      <Navigation />
      <BookSlotContent />
    </>
  )
}
