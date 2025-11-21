// app/LMR/slots/new/page.tsx - Post Slot (Minimal MVP)
'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getDevSession } from '@/lib/auth/dev-session'
import Navigation from '@/components/common/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

/**
 * Post Slot - Minimal MVP Version
 *
 * Simplified from complex booking system to direct contact model.
 * - Location-based (P1-P6, tower, landmark) instead of slot numbers
 * - Time window (from/until) instead of pricing/bookings
 * - Status updates (AVAILABLE → TAKEN) instead of booking management
 * - Direct contact (Viber/phone) instead of booking system
 *
 * Matches schema from 001_core_schema.sql
 */
function NewSlotContent() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    location_level: 'P1',
    location_tower: 'East Tower',
    location_landmark: '',
    available_from_date: '',
    available_from_time: '',
    available_until_date: '',
    available_until_time: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get authenticated user - check dev session first, then Supabase
      const devSession = getDevSession()
      let userId: string | undefined

      if (devSession) {
        // Dev mode - use dev session user ID
        userId = devSession.user_id
      } else {
        // Production mode - use Supabase auth
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('You must be logged in to post a slot')
        }
        userId = user.id
      }

      if (!userId) {
        throw new Error('You must be logged in to post a slot')
      }

      // Validate required fields
      if (!formData.available_from_date || !formData.available_from_time) {
        throw new Error('Please set when your slot becomes available')
      }
      if (!formData.available_until_date || !formData.available_until_time) {
        throw new Error('Please set when your slot becomes unavailable')
      }

      // Combine date and time into timestamps
      const availableFrom = new Date(`${formData.available_from_date}T${formData.available_from_time}`)
      const availableUntil = new Date(`${formData.available_until_date}T${formData.available_until_time}`)

      // Validate time range
      if (availableUntil <= availableFrom) {
        throw new Error('End time must be after start time')
      }

      // Insert slot using Supabase client
      const { data, error: insertError } = await supabase
        .from('parking_slots')
        .insert({
          owner_id: userId,
          location_level: formData.location_level,
          location_tower: formData.location_tower,
          location_landmark: formData.location_landmark || null,
          available_from: availableFrom.toISOString(),
          available_until: availableUntil.toISOString(),
          status: 'available',
          notes: formData.notes || null
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (data) {
        // Success - redirect to slots listing
        router.push('/LMR/slots')
      }

    } catch (err: unknown) {
      const error = err as Error
      console.error('Create slot error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Share Your Parking Slot</CardTitle>
          <p className="text-sm text-gray-600">
            Simple as posting on Viber - tell neighbors when your slot is free
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-medium text-gray-900">Where is your slot?</h3>

              {/* Parking Level */}
              <div>
                <label htmlFor="location_level" className="block text-sm font-medium mb-1">
                  Parking Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="location_level"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.location_level}
                  onChange={(e) => setFormData({ ...formData, location_level: e.target.value })}
                >
                  <option value="P1">P1 (Ground Level)</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                  <option value="P5">P5</option>
                  <option value="P6">P6 (Top Level)</option>
                </select>
              </div>

              {/* Tower */}
              <div>
                <label htmlFor="location_tower" className="block text-sm font-medium mb-1">
                  Tower <span className="text-red-500">*</span>
                </label>
                <select
                  id="location_tower"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.location_tower}
                  onChange={(e) => setFormData({ ...formData, location_tower: e.target.value })}
                >
                  <option value="East Tower">East Tower</option>
                  <option value="North Tower">North Tower</option>
                  <option value="West Tower">West Tower</option>
                </select>
              </div>

              {/* Landmark (Optional) */}
              <div>
                <label htmlFor="location_landmark" className="block text-sm font-medium mb-1">
                  Landmark / Description (Optional)
                </label>
                <Input
                  id="location_landmark"
                  type="text"
                  placeholder="e.g., near elevator, corner spot"
                  value={formData.location_landmark}
                  onChange={(e) => setFormData({ ...formData, location_landmark: e.target.value })}
                />
              </div>
            </div>

            {/* Availability Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-medium text-gray-900">When is it available?</h3>

              {/* Available From */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Available From <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    required
                    value={formData.available_from_date}
                    onChange={(e) => setFormData({ ...formData, available_from_date: e.target.value })}
                  />
                  <Input
                    type="time"
                    required
                    value={formData.available_from_time}
                    onChange={(e) => setFormData({ ...formData, available_from_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Available Until */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Available Until <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    required
                    value={formData.available_until_date}
                    onChange={(e) => setFormData({ ...formData, available_until_date: e.target.value })}
                  />
                  <Input
                    type="time"
                    required
                    value={formData.available_until_time}
                    onChange={(e) => setFormData({ ...formData, available_until_time: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special instructions or notes for neighbors..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Posting...' : 'Post Slot'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/LMR/slots')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        <p>After posting, neighbors can see your slot and contact you directly.</p>
        <p className="mt-1">Update status to &quot;TAKEN&quot; once someone uses it.</p>
      </div>
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
