/**
 * TEST-API-BOOKINGS-002: Booking Cancel Endpoint (COMPREHENSIVE)
 * Priority: P0
 * Source: P0-004 implementation
 * Updated: 2025-12-14
 *
 * This test suite validates:
 * - Authorization: user must be renter OR slot owner
 * - Tenant isolation (community_code filtering)
 * - Status validation: only allows status='cancelled'
 * - Business rules: can't cancel completed/no_show bookings
 * - Idempotency: cancelling already cancelled booking returns 200
 * - Database error handling
 */

import { PATCH } from '@/app/api/bookings/[id]/route'
import { getSessionWithCommunity } from '@/lib/auth/tenant-access'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/auth/tenant-access')
jest.mock('@/lib/supabase/server')

const mockGetSessionWithCommunity = getSessionWithCommunity as jest.MockedFunction<
  typeof getSessionWithCommunity
>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('PATCH /api/bookings/[id]', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    }
    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 for unauthenticated users', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        error: 'Unauthorized',
        status: 401,
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 403 for users without community assignment', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        error: 'No community assigned',
        status: 403,
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('No community assigned')
    })
  })

  describe('ID Validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/bookings/invalid-uuid', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: 'invalid-uuid' },
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Invalid booking ID')
    })
  })

  describe('Request Validation', () => {
    it('should only allow status="cancelled" (P0 security)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }), // Try to manipulate status
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Only status="cancelled" is allowed')
    })

    it('should reject request without status field', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({}), // Missing status field
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Booking Existence and Tenant Isolation', () => {
    it('should return 404 for non-existent booking', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Booking not found')
    })

    it('should return 403 for booking in different community (tenant isolation)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: {
          booking_id: '123e4567-e89b-12d3-a456-426614174000',
          renter_id: 'user-123',
          slot_owner_id: 'other-user',
          status: 'pending',
          parking_slots: {
            community_code: 'srp_abc123', // Different community
          },
        },
        error: null,
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('Not authorized to cancel this booking')
    })
  })

  describe('Authorization: Renter OR Owner', () => {
    it('should allow renter to cancel their booking', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const booking = {
        booking_id: '123e4567-e89b-12d3-a456-426614174000',
        renter_id: userId, // User is renter
        slot_owner_id: 'other-user',
        status: 'pending',
        parking_slots: {
          community_code: 'lmr_x7k9p2',
        },
      }

      mockSupabase.single
        .mockResolvedValueOnce({
          data: booking,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...booking, status: 'cancelled' },
          error: null,
        })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(200)
    })

    it('should allow slot owner to cancel booking', async () => {
      const userId = 'owner-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const booking = {
        booking_id: '123e4567-e89b-12d3-a456-426614174000',
        renter_id: 'other-user',
        slot_owner_id: userId, // User is slot owner
        status: 'pending',
        parking_slots: {
          community_code: 'lmr_x7k9p2',
        },
      }

      mockSupabase.single
        .mockResolvedValueOnce({
          data: booking,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...booking, status: 'cancelled' },
          error: null,
        })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(200)
    })

    it('should return 403 when user is neither renter nor owner', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: {
          booking_id: '123e4567-e89b-12d3-a456-426614174000',
          renter_id: 'other-user-1', // Different user
          slot_owner_id: 'other-user-2', // Different user
          status: 'pending',
          parking_slots: {
            community_code: 'lmr_x7k9p2',
          },
        },
        error: null,
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('Not authorized to cancel this booking')
    })
  })

  describe('Business Rules', () => {
    it('should be idempotent - allow cancelling already cancelled booking (returns 200)', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const alreadyCancelled = {
        booking_id: '123e4567-e89b-12d3-a456-426614174000',
        renter_id: userId,
        slot_owner_id: 'other-user',
        status: 'cancelled', // Already cancelled
        parking_slots: {
          community_code: 'lmr_x7k9p2',
        },
      }

      mockSupabase.single.mockResolvedValue({
        data: alreadyCancelled,
        error: null,
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.status).toBe('cancelled')
    })

    it('should return 400 when trying to cancel completed booking', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: {
          booking_id: '123e4567-e89b-12d3-a456-426614174000',
          renter_id: userId,
          slot_owner_id: 'other-user',
          status: 'completed', // Cannot cancel completed
          parking_slots: {
            community_code: 'lmr_x7k9p2',
          },
        },
        error: null,
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Cannot cancel completed or no_show bookings')
    })

    it('should return 400 when trying to cancel no_show booking', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: {
          booking_id: '123e4567-e89b-12d3-a456-426614174000',
          renter_id: userId,
          slot_owner_id: 'other-user',
          status: 'no_show', // Cannot cancel no_show
          parking_slots: {
            community_code: 'lmr_x7k9p2',
          },
        },
        error: null,
      })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Cannot cancel completed or no_show bookings')
    })
  })

  describe('Successful Cancellation', () => {
    it('should cancel booking and return 200 with updated data', async () => {
      const userId = 'user-123'
      const bookingId = '123e4567-e89b-12d3-a456-426614174000'

      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const pendingBooking = {
        booking_id: bookingId,
        renter_id: userId,
        slot_owner_id: 'other-user',
        status: 'pending',
        parking_slots: {
          community_code: 'lmr_x7k9p2',
        },
      }

      const cancelledBooking = {
        ...pendingBooking,
        status: 'cancelled',
      }

      mockSupabase.single
        .mockResolvedValueOnce({
          data: pendingBooking,
          error: null,
        })
        .mockResolvedValueOnce({
          data: cancelledBooking,
          error: null,
        })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: bookingId },
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.status).toBe('cancelled')
    })
  })

  describe('Database Error Handling', () => {
    it('should return 500 on database error', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            booking_id: '123e4567-e89b-12d3-a456-426614174000',
            renter_id: userId,
            slot_owner_id: 'other-user',
            status: 'pending',
            parking_slots: {
              community_code: 'lmr_x7k9p2',
            },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' },
        })

      const req = new Request('http://localhost/api/bookings/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('Failed to cancel booking')
    })
  })
})
