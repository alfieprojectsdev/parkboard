/**
 * TEST-API-SLOTS-001: Slots API GET and POST Endpoints (COMPREHENSIVE)
 * Priority: P0
 * Source: P0-004 implementation
 * Updated: 2025-12-14
 *
 * This test suite validates:
 * - Tenant isolation (community_code filtering)
 * - Authentication (401 for unauthenticated users)
 * - Authorization (403 for users without community)
 * - Request validation (400 for invalid data)
 * - Server-side field assignment (community_code, owner_id)
 * - Database error handling (unique constraints, etc.)
 */

import { GET, POST } from '@/app/api/slots/route'
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

describe('GET /api/slots', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock Supabase client with chainable methods
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
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

      const req = new Request('http://localhost/api/slots')
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
    it('should filter slots by user community (tenant isolation)', async () => {
      const communityCode = 'lmr_x7k9p2'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode,
        session: {} as any,
      })

      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null,
      })

      await GET()

      // Verify tenant isolation query
      expect(mockSupabase.from).toHaveBeenCalledWith('parking_slots')
      expect(mockSupabase.eq).toHaveBeenCalledWith('community_code', communityCode)
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('should only return active slots', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const mockSlots = [
        { slot_id: '1', status: 'active', slot_number: 'A-10' },
        { slot_id: '2', status: 'active', slot_number: 'B-15' },
      ]

      mockSupabase.order.mockResolvedValue({
        data: mockSlots,
        error: null,
      })

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toEqual(mockSlots)
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
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
        error: { message: 'Database connection failed' },
      })

      const response = await GET()

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('Failed to fetch slots')
    })
  })

  describe('Successful Retrieval', () => {
    it('should return slots for authenticated user in their community', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const mockSlots = [
        {
          slot_id: 'slot-1',
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
          status: 'active',
          community_code: 'lmr_x7k9p2',
        },
      ]

      mockSupabase.order.mockResolvedValue({
        data: mockSlots,
        error: null,
      })

      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data).toEqual(mockSlots)
    })
  })
})

describe('POST /api/slots', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
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

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 403 for users without community assignment', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        error: 'No community assigned',
        status: 403,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('No community assigned')
    })
  })

  describe('Request Validation (Zod)', () => {
    it('should return 400 for missing required fields', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          // Missing slot_number, slot_type, price_per_hour
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Required')
    })

    it('should return 400 for invalid slot_type', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'invalid_type',
          price_per_hour: 5.0,
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBeDefined()
    })

    it('should return 400 for negative price_per_hour', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: -5.0,
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('greater than 0')
    })

    it('should return 400 for zero price_per_hour', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 0,
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('greater than 0')
    })
  })

  describe('Server-Side Field Assignment (P0 Security)', () => {
    it('should set owner_id from authenticated session', async () => {
      const userId = 'user-123'
      const communityCode = 'lmr_x7k9p2'

      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode,
        session: {} as any,
      })

      const createdSlot = {
        slot_id: 'new-slot-id',
        slot_number: 'A-10',
        slot_type: 'covered',
        price_per_hour: 5.0,
        owner_id: userId,
        community_code: communityCode,
        status: 'active',
      }

      mockSupabase.single.mockResolvedValue({
        data: createdSlot,
        error: null,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
        }),
      })

      await POST(req as NextRequest)

      // Verify server-side fields are set
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        slot_number: 'A-10',
        slot_type: 'covered',
        price_per_hour: 5.0,
        owner_id: userId,
        community_code: communityCode,
        status: 'active',
      })
    })

    it('should NEVER accept community_code from client (P0 security)', async () => {
      const userId = 'user-123'
      const actualCommunityCode = 'lmr_x7k9p2'

      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: actualCommunityCode,
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: { slot_id: 'new-slot', community_code: actualCommunityCode },
        error: null,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
          community_code: 'malicious_code', // Client tries to set community_code
        }),
      })

      await POST(req as NextRequest)

      // Verify server-side community_code is used, not client-provided
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          community_code: actualCommunityCode, // Server-side value
        })
      )
    })
  })

  describe('Database Constraint Handling', () => {
    it('should return 400 for duplicate slot_number (unique constraint)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Slot number already exists')
    })

    it('should return 500 for generic database errors', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('Failed to create slot')
    })
  })

  describe('Successful Slot Creation', () => {
    it('should create slot and return 201 with created data', async () => {
      const userId = 'user-123'
      const communityCode = 'lmr_x7k9p2'

      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode,
        session: {} as any,
      })

      const createdSlot = {
        slot_id: 'new-slot-id',
        slot_number: 'A-10',
        slot_type: 'covered',
        price_per_hour: 5.0,
        description: 'Covered parking near elevator',
        owner_id: userId,
        community_code: communityCode,
        status: 'active',
      }

      mockSupabase.single.mockResolvedValue({
        data: createdSlot,
        error: null,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
          description: 'Covered parking near elevator',
        }),
      })

      const response = await POST(req as NextRequest)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data).toEqual(createdSlot)
    })

    it('should create slot with optional description', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: { slot_id: 'new-slot', description: 'Near elevator' },
        error: null,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
          description: 'Near elevator',
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(201)
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Near elevator',
        })
      )
    })

    it('should create slot without optional description', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: { slot_id: 'new-slot' },
        error: null,
      })

      const req = new Request('http://localhost/api/slots', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: 'A-10',
          slot_type: 'covered',
          price_per_hour: 5.0,
        }),
      })

      const response = await POST(req as NextRequest)

      expect(response.status).toBe(201)
    })
  })
})
