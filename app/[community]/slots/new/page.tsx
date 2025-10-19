// app/[community]/slots/new/page.tsx - List new slot (HYBRID PRICING + MULTI-TENANT)
'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCommunity } from '@/lib/context/CommunityContext'
import { useAuth } from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

function NewSlotContent() {
  const community = useCommunity()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    slot_number: '',
    slot_type: 'covered',
    description: '',
    pricing_type: 'explicit' as 'explicit' | 'request_quote',  // NEW: Pricing type
    price_per_hour: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // SUBMIT NEW SLOT (Updated for hybrid pricing)
  // ============================================================================

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validation
      if (!formData.slot_number.trim()) {
        throw new Error('Slot number is required')
      }

      // NEW: Conditional price validation based on pricing type
      let pricePerHour: number | null = null

      if (formData.pricing_type === 'explicit') {
        // Explicit pricing requires a valid price
        pricePerHour = parseFloat(formData.price_per_hour)

        if (isNaN(pricePerHour) || pricePerHour <= 0) {
          throw new Error('Price must be greater than 0 for instant booking')
        }
      } else {
        // Request Quote uses NULL price
        pricePerHour = null
      }

      // Insert slot with conditional pricing
      const { error: insertError } = await supabase
        .from('parking_slots')
        .insert({
          owner_id: user!.id,
          community_code: community.code,  // Multi-tenant: Required field
          slot_number: formData.slot_number.trim().toUpperCase(),
          slot_type: formData.slot_type,
          description: formData.description.trim() || null,
          price_per_hour: pricePerHour,  // NEW: Can be NULL for Request Quote
          status: 'active'
        })

      if (insertError) {
        // Handle duplicate slot number (unique constraint)
        if (insertError.code === '23505') {
          throw new Error('This slot number already exists. Please use a different number.')
        }
        throw insertError
      }

      // Success - redirect to slots listing
      router.push(`/${community.code}/slots`)

    } catch (err: unknown) {
      const error = err as Error
      console.error('Create slot error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // RENDER (Updated UI with pricing type selector)
  // ============================================================================

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">List Your Parking Slot</CardTitle>
          <p className="text-sm text-gray-600">
            Share your parking space with the community
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Slot Number */}
            <div>
              <label htmlFor="slot_number" className="block text-sm font-medium mb-1">
                Slot Number <span className="text-red-500">*</span>
              </label>
              <Input
                id="slot_number"
                type="text"
                required
                placeholder="A-123"
                value={formData.slot_number}
                onChange={(e) => setFormData({ ...formData, slot_number: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                This should match the number painted on your parking slot
              </p>
            </div>

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

            {/* NEW: Pricing Type Selector */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-3">
                Pricing Options <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {/* Option 1: Explicit Pricing */}
                <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: formData.pricing_type === 'explicit' ? '#3b82f6' : '#e5e7eb',
                    backgroundColor: formData.pricing_type === 'explicit' ? '#eff6ff' : 'white'
                  }}>
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
                      Set an hourly rate and allow instant bookings. Renters can book immediately without contacting you.
                    </p>
                  </div>
                </label>

                {/* Option 2: Request Quote */}
                <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: formData.pricing_type === 'request_quote' ? '#3b82f6' : '#e5e7eb',
                    backgroundColor: formData.pricing_type === 'request_quote' ? '#eff6ff' : 'white'
                  }}>
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
                      Don&apos;t show pricing publicly. Renters will contact you to discuss rates and availability.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Conditional Price Input - Only show for explicit pricing */}
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
                      Your slot will be visible in the marketplace, but renters won&apos;t see a price.
                      They&apos;ll need to call or message you directly to discuss rates and book.
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>Tip:</strong> Make sure your phone number is up to date in your profile
                      so renters can reach you easily.
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
                onClick={() => router.push(`/${community.code}/slots`)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating Listing...' : 'List Slot'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewSlotPage() {
  return (
    <>
      <Navigation />
      <NewSlotContent />
    </>
  )
}
