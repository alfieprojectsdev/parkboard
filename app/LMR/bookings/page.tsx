// app/LMR/bookings/page.tsx - My bookings
'use client'

// Force dynamic rendering for pages using auth context
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper'
import Navigation from '@/components/common/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'

interface Booking {
  booking_id: number
  start_time: string
  end_time: string
  total_price: number
  status: string
  created_at: string
  parking_slots: {
    slot_number: string
    user_profiles: {
      name: string
      phone: string
    }
  } | null
}

function BookingsContent() {
  const { user } = useAuth()
  const supabase = createClient()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // FETCH USER'S BOOKINGS
  // ============================================================================

  useEffect(() => {
    async function fetchBookings() {
      try {
        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            booking_id,
            start_time,
            end_time,
            total_price,
            status,
            created_at,
            parking_slots (
              slot_number,
              user_profiles (
                name,
                phone
              )
            )
          `)
          .eq('renter_id', user!.id)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        // Type assertion needed because Supabase joins return proper structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setBookings((data as any) || [])
      } catch (err: unknown) {
        const error = err as Error
        console.error('Error fetching bookings:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // Only re-fetch if user ID changes. supabase is a stable client.

  // ============================================================================
  // CANCEL BOOKING
  // ============================================================================

  async function handleCancel(bookingId: number) {
    const confirmed = window.confirm('Are you sure you want to cancel this booking?')

    if (!confirmed) return

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('booking_id', bookingId)
        .eq('renter_id', user!.id)

      if (updateError) throw updateError

      // Optimistic update - update local state
      setBookings(bookings.map(b =>
        b.booking_id === bookingId
          ? { ...b, status: 'cancelled' }
          : b
      ))

    } catch (err: unknown) {
      const error = err as Error
      console.error('Cancel error:', error)
      alert('Failed to cancel booking: ' + error.message)
    }
  }

  // ============================================================================
  // HELPER: Get Status Badge Color
  // ============================================================================

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'no_show':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // ============================================================================
  // HELPER: Format Date/Time
  // ============================================================================

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
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

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Alert variant="destructive">
          Error loading bookings: {error}
        </Alert>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4 text-lg">You haven&apos;t made any bookings yet.</p>
          <Link href="/LMR/slots">
            <Button>Browse Available Slots</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>

      <div className="space-y-4">
        {bookings.map(booking => (
          <Card key={booking.booking_id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">
                  Slot {booking.parking_slots?.slot_number || 'N/A'}
                </CardTitle>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Booking Details */}
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Booking ID</span>
                    <p className="font-medium">#{booking.booking_id}</p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">Start Time</span>
                    <p className="font-medium">{formatDateTime(booking.start_time)}</p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">End Time</span>
                    <p className="font-medium">{formatDateTime(booking.end_time)}</p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">Total Price</span>
                    <p className="font-medium text-blue-600 text-lg">
                      ₱{booking.total_price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Owner Contact */}
                <div className="space-y-2">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-sm text-gray-500 block mb-2">Owner Contact</span>
                    <p className="font-medium">{booking.parking_slots?.user_profiles?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{booking.parking_slots?.user_profiles?.phone || 'N/A'}</p>
                  </div>

                  {/* Cancel Button (only for pending bookings) */}
                  {booking.status === 'pending' && (
                    <Button
                      variant="outline"
                      onClick={() => handleCancel(booking.booking_id)}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function BookingsPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <BookingsContent />
    </AuthWrapper>
  )
}
