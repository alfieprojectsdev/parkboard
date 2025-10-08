// app/(marketplace)/slots/new/page.tsx - List new slot
'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthWrapper'
import AuthWrapper from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

function NewSlotContent() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    slot_number: '',
    slot_type: 'covered',
    description: '',
    price_per_hour: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // SUBMIT NEW SLOT
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

      const pricePerHour = parseFloat(formData.price_per_hour)

      if (isNaN(pricePerHour) || pricePerHour <= 0) {
        throw new Error('Price must be greater than 0')
      }

      // Insert slot
      const { error: insertError } = await supabase
        .from('parking_slots')
        .insert({
          owner_id: user!.id,
          slot_number: formData.slot_number.trim().toUpperCase(),
          slot_type: formData.slot_type,
          description: formData.description.trim() || null,
          price_per_hour: pricePerHour,
          status: 'active'  // Use 'status' not 'is_available'
        })

      if (insertError) {
        // Handle duplicate slot number (unique constraint)
        if (insertError.code === '23505') {
          throw new Error('This slot number already exists. Please use a different number.')
        }
        throw insertError
      }

      // Success - redirect to slots listing
      router.push('/slots')

    } catch (err: any) {
      console.error('Create slot error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // RENDER
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

            {/* Price Per Hour */}
            <div>
              <label htmlFor="price_per_hour" className="block text-sm font-medium mb-1">
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
              />
              <p className="text-xs text-gray-500 mt-1">
                Suggested: ₱30-100/hour depending on location and amenities
              </p>
            </div>

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
                onClick={() => router.push('/slots')}
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
    <AuthWrapper>
      <Navigation />
      <NewSlotContent />
    </AuthWrapper>
  )
}
