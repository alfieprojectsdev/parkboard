// app/[community]/slots/[slotId]/edit/page.tsx - Edit slot (HYBRID PRICING + MULTI-TENANT)
'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCommunity } from '@/lib/context/CommunityContext'
import { useAuth } from '@/components/auth/AuthWrapper'
import AuthWrapper from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

type SlotData = {
  slot_id: number
  owner_id: string
  slot_number: string
  slot_type: string
  description: string | null
  price_per_hour: number | null
  status: string
  community_code: string
}

function EditSlotContent() {
  const community = useCommunity()
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const supabase = createClient()

  const slotId = params?.slotId as string

  const [formData, setFormData] = useState({
    slot_type: 'covered',
    description: '',
    pricing_type: 'explicit' as 'explicit' | 'request_quote',
    price_per_hour: ''
  })
  const [originalSlot, setOriginalSlot] = useState<SlotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // FETCH SLOT DATA
  // ============================================================================

  useEffect(() => {
    async function fetchSlot() {
      if (!user || !slotId) return

      try {
        const { data: slot, error: fetchError } = await supabase
          .from('parking_slots')
          .select('*')
          .eq('slot_id', parseInt(slotId))
          .eq('community_code', community.code)
          .single()

        if (fetchError) throw fetchError
        if (!slot) throw new Error('Slot not found')

        // Check ownership
        if (slot.owner_id !== user.id) {
          throw new Error('You can only edit your own slots')
        }

        // Check for active bookings
        const { data: activeBookings, error: bookingError } = await supabase
          .from('bookings')
          .select('booking_id')
          .eq('slot_id', slot.slot_id)
          .in('status', ['pending', 'confirmed'])
          .gte('end_time', new Date().toISOString())

        if (bookingError) throw bookingError

        if (activeBookings && activeBookings.length > 0) {
          setError(`Cannot edit slot with ${activeBookings.length} active booking(s). Wait until bookings complete or cancel them first.`)
          setLoading(false)
          return
        }

        // Set form data
        setOriginalSlot(slot)
        setFormData({
          slot_type: slot.slot_type,
          description: slot.description || '',
          pricing_type: slot.price_per_hour === null ? 'request_quote' : 'explicit',
          price_per_hour: slot.price_per_hour ? slot.price_per_hour.toString() : ''
        })

        setLoading(false)

      } catch (err: unknown) {
        const error = err as Error
        console.error('Fetch slot error:', error)
        setError(error.message)
        setLoading(false)
      }
    }

    fetchSlot()
  }, [user, slotId, community.code, supabase])

  // ============================================================================
  // SUBMIT EDITED SLOT
  // ============================================================================

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (!originalSlot) throw new Error('Slot data not loaded')

      // Validate pricing
      let pricePerHour: number | null = null

      if (formData.pricing_type === 'explicit') {
        pricePerHour = parseFloat(formData.price_per_hour)

        if (isNaN(pricePerHour) || pricePerHour <= 0) {
          throw new Error('Price must be greater than 0 for instant booking')
        }
      } else {
        pricePerHour = null
      }

      // Update slot
      const { error: updateError } = await supabase
        .from('parking_slots')
        .update({
          slot_type: formData.slot_type,
          description: formData.description.trim() || null,
          price_per_hour: pricePerHour,
          updated_at: new Date().toISOString()
        })
        .eq('slot_id', originalSlot.slot_id)
        .eq('owner_id', user!.id) // Double-check ownership

      if (updateError) throw updateError

      // Success - redirect to slot detail
      router.push(`/${community.code}/slots/${slotId}`)

    } catch (err: unknown) {
      const error = err as Error
      console.error('Update slot error:', error)
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading slot details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !originalSlot) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push(`/${community.code}/slots`)}
        >
          ← Back to Slots
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Parking Slot</CardTitle>
          <p className="text-sm text-gray-600">
            Slot Number: <strong>{originalSlot?.slot_number}</strong> (cannot be changed)
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Slot Type */}
            <div>
              <label htmlFor="slot_type" className="block text-sm font-medium mb-1">
                Slot Type <span className="text-red-500">*</span>
              </label>
              <select
                id="slot_type"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.slot_type}
                onChange={(e) => setFormData({ ...formData, slot_type: e.target.value })}
              >
                <option value="covered">Covered</option>
                <option value="uncovered">Uncovered</option>
                <option value="tandem">Tandem</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description (Optional)
              </label>
              <textarea
                id="description"
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Near elevator, easy access, EV charging available..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Pricing Type Selector */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-3">
                Pricing Options <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {/* Option 1: Explicit Pricing */}
                <label
                  className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: formData.pricing_type === 'explicit' ? '#3b82f6' : '#e5e7eb',
                    backgroundColor: formData.pricing_type === 'explicit' ? '#eff6ff' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="pricing_type"
                    value="explicit"
                    checked={formData.pricing_type === 'explicit'}
                    onChange={() => setFormData({ ...formData, pricing_type: 'explicit' })}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">Set Fixed Price</span>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        ✓ Instant Booking
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Set an hourly rate and allow instant bookings.
                    </p>
                  </div>
                </label>

                {/* Option 2: Request Quote */}
                <label
                  className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: formData.pricing_type === 'request_quote' ? '#3b82f6' : '#e5e7eb',
                    backgroundColor: formData.pricing_type === 'request_quote' ? '#eff6ff' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="pricing_type"
                    value="request_quote"
                    checked={formData.pricing_type === 'request_quote'}
                    onChange={() => setFormData({ ...formData, pricing_type: 'request_quote' })}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">Request Quote</span>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Contact Required
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Don&apos;t show pricing publicly. Renters contact you to discuss rates.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Conditional Price Input */}
            {formData.pricing_type === 'explicit' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label htmlFor="price_per_hour" className="block text-sm font-medium mb-2">
                  Price Per Hour (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  id="price_per_hour"
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="50.00"
                  value={formData.price_per_hour}
                  onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                  className="bg-white"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Suggested: ₱30-100/hour depending on location and amenities
                </p>
              </div>
            )}

            {/* Request Quote Explanation */}
            {formData.pricing_type === 'request_quote' && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 text-lg">ℹ️</span>
                  <div>
                    <strong className="text-gray-900">Request Quote Mode</strong>
                    <p className="text-sm text-gray-700 mt-1">
                      Your slot will be visible, but renters won&apos;t see a price.
                      They&apos;ll contact you directly to discuss rates.
                    </p>
                  </div>
                </div>
              </Alert>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${community.code}/slots/${slotId}`)}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function EditSlotPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <EditSlotContent />
    </AuthWrapper>
  )
}
