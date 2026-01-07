/**
 * TEST-API-BOOKINGS-001: Bookings API GET and POST Endpoints (COMPREHENSIVE)
 * Priority: P0
 * Source: P0-004 implementation
 * Updated: 2025-12-14
 *
 * This test suite validates:
 * - Tenant isolation (community_code filtering)
 * - Authentication and authorization
 * - CRITICAL: Server-side price calculation (NEVER accept client total_price)
 * - Slot availability validation
 * - Business rules (can't book own slot, overlapping bookings)
 * - Database trigger validation (total_price calculation)
 * - Error handling (slot not found, not in community, etc.)
 */

import { GET, POST } from '@/app/api/bookings/route'
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

describe('GET /api/bookings', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    }
    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 for unauthenticated users', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        error: 'Unauthorized',
        status: 401,
      })

      const response = await GET()

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 403 for users without community assignment', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        error: 'No community assigned',
        status: 403,
      })

      const response = await GET()

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('No community assigned')
    })
  })

  describe('Tenant Isolation', () => {
    it('should filter bookings by user community (tenant isolation)', async () => {
      const userId = 'user-123'
      const communityCode = 'lmr_x7k9p2'

      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode,
        session: {} as any,
      })

      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      })

      await GET()

      // Verify tenant isolation via joined slot's community_code
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        'parking_slots.community_code',
        communityCode
      )
    })

    it('should show bookings where user is renter OR slot owner', async () => {
      const userId = 'user-123'
      const communityCode = 'lmr_x7k9p2'

      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode,
        session: {} as any,
      })

      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      })

      await GET()

      // Verify OR condition for renter_id and slot_owner_id
      expect(mockSupabase.or).toHaveBeenCalledWith(
        `renter_id.eq.${userId},slot_owner_id.eq.${userId}`
      )
    })
  })

  describe('Join with Slot Details', () => {
    it('should join with parking_slots to include slot information', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      })

      await GET()

      // Verify join with parking_slots
      expect(mockSupabase.select).toHaveBeenCalledWith(
        expect.stringContaining('parking_slots!inner')
      )
    })

    it('should return bookings with slot details', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const mockBookings = [
        {
          booking_id: 'booking-1',
          renter_id: userId,
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
          total_price: 10.0,
          status: 'pending',
          parking_slots: {
            slot_id: 'slot-1',
            slot_number: 'A-10',
            slot_type: 'covered',
            price_per_hour: 5.0,
            community_code: 'lmr_x7k9p2',
          },
        },
      ]

      mockSupabase.order.mockResolvedValue({
        data: mockBookings,
        error: null,
      })

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toEqual(mockBookings)
    })
  })

  describe('Database Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const response = await GET()

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('Failed to fetch bookings')
    })
  })
})

describe('POST /api/bookings', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
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

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(401)
    })
  })

  describe('Request Validation', () => {
    it('should return 400 for missing required fields', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid slot_id (not UUID)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: 'invalid-uuid',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Invalid slot ID')
    })

    it('should return 400 when end_time is before start_time', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T12:00:00Z',
          end_time: '2026-06-15T10:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('End time must be after start time')
    })
  })

  describe('Slot Validation', () => {
    it('should return 404 for non-existent slot', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Slot not found')
    })

    it('should return 403 for slot in different community (tenant isolation)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          owner_id: 'other-user',
          community_code: 'srp_abc123', // Different community
          status: 'active',
        },
        error: null,
      })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('Slot not in your community')
    })

    it('should return 400 for inactive slot', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          owner_id: 'other-user',
          community_code: 'lmr_x7k9p2',
          status: 'maintenance', // Not active
        },
        error: null,
      })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Slot not available')
    })
  })

  describe('Business Rules', () => {
    it('should return 400 when user tries to book their own slot', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          owner_id: userId, // Same as authenticated user
          community_code: 'lmr_x7k9p2',
          status: 'active',
        },
        error: null,
      })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Cannot book your own slot')
    })
  })

  describe('Server-Side Price Calculation (P0 CRITICAL)', () => {
    it('should NEVER accept total_price from client (-$3000 penalty)', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            slot_id: '123e4567-e89b-12d3-a456-426614174000',
            owner_id: 'other-user',
            community_code: 'lmr_x7k9p2',
            status: 'active',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            booking_id: 'new-booking',
            total_price: 10.0, // Database trigger sets this
          },
          error: null,
        })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
          total_price: 999.99, // Client tries to manipulate price
        }),
      })

      await POST(req as NextRequest)

      // Verify total_price is NOT sent to database
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.not.objectContaining({
          total_price: expect.anything(),
        })
      )

      // Verify only valid fields are sent
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        slot_id: '123e4567-e89b-12d3-a456-426614174000',
        renter_id: userId,
        start_time: '2026-06-15T10:00:00Z',
        end_time: '2026-06-15T12:00:00Z',
        status: 'pending',
        // NO total_price - database trigger calculates this
      })
    })

    it('should rely on database trigger to calculate total_price', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const calculatedPrice = 15.0 // Database trigger calculates: 5/hr * 3 hours

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            slot_id: '123e4567-e89b-12d3-a456-426614174000',
            owner_id: 'other-user',
            community_code: 'lmr_x7k9p2',
            status: 'active',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            booking_id: 'new-booking',
            total_price: calculatedPrice, // From database trigger
          },
          error: null,
        })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T13:00:00Z', // 3 hours
        }),
      })

      const response = await POST(req as NextRequest)
      const json = await response.json()

      // Verify response includes database-calculated price
      expect(response.status).toBe(201)
      expect(json.data.total_price).toBe(calculatedPrice)
    })
  })

  describe('Overlapping Booking Prevention', () => {
    it('should return 409 for overlapping bookings (EXCLUDE constraint)', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            slot_id: '123e4567-e89b-12d3-a456-426614174000',
            owner_id: 'other-user',
            community_code: 'lmr_x7k9p2',
            status: 'active',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: '23P01', message: 'overlapping exclusion constraint' },
        })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(409)
      const json = await response.json()
      expect(json.error).toBe('Slot is already booked for this time period')
    })
  })

  describe('Successful Booking Creation', () => {
    it('should create booking and return 201 with booking data', async () => {
      const userId = 'user-123'
      const slotId = '123e4567-e89b-12d3-a456-426614174000'

      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const createdBooking = {
        booking_id: 'new-booking-id',
        slot_id: slotId,
        renter_id: userId,
        start_time: '2026-06-15T10:00:00Z',
        end_time: '2026-06-15T12:00:00Z',
        total_price: 10.0,
        status: 'pending',
      }

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            slot_id: slotId,
            owner_id: 'other-user',
            community_code: 'lmr_x7k9p2',
            status: 'active',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: createdBooking,
          error: null,
        })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: slotId,
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data).toEqual(createdBooking)
    })
  })

  describe('Database Error Handling', () => {
    it('should return 500 for generic database errors', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            slot_id: '123e4567-e89b-12d3-a456-426614174000',
            owner_id: 'other-user',
            community_code: 'lmr_x7k9p2',
            status: 'active',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' },
        })

      const req = new Request('http://localhost/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          start_time: '2026-06-15T10:00:00Z',
          end_time: '2026-06-15T12:00:00Z',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('Failed to create booking')
    })
  })
})
