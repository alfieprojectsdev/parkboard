/**
 * TEST-API-SLOTS-002: Slots API PATCH and DELETE Endpoints (COMPREHENSIVE)
 * Priority: P0
 * Source: P0-004 implementation
 * Updated: 2025-12-14
 *
 * This test suite validates:
 * - Ownership verification (owner_id === userId)
 * - Tenant isolation (community_code filtering)
 * - Authentication and authorization
 * - Request validation (UUID format, Zod schemas)
 * - Prevention of unauthorized field changes (community_code)
 * - Active booking check (DELETE)
 * - Database error handling
 */

import { PATCH, DELETE } from '@/app/api/slots/[id]/route'
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

describe('PATCH /api/slots/[id]', () => {
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

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_hour: 10 }),
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

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_hour: 10 }),
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

      const req = new Request('http://localhost/api/slots/invalid-uuid', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_hour: 10 }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: 'invalid-uuid' },
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Invalid slot ID format')
    })
  })

  describe('Ownership Verification', () => {
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

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_hour: 10 }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Slot not found')
    })

    it('should return 404 for slot in different community (tenant isolation)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      // Mock slot in different community - won't be found due to community_code filter
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_hour: 10 }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(404)
      expect(mockSupabase.eq).toHaveBeenCalledWith('community_code', 'lmr_x7k9p2')
    })

    it('should return 403 when user does not own the slot', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      // Slot exists but owned by different user
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          owner_id: 'other-user',
          community_code: 'lmr_x7k9p2',
        },
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_hour: 10 }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('You do not own this slot')
    })
  })

  describe('Request Validation', () => {
    it('should return 400 for invalid slot_type', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          owner_id: 'user-123',
          community_code: 'lmr_x7k9p2',
        },
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({ slot_type: 'invalid_type' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(400)
    })

    it('should return 400 for negative price_per_hour', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          owner_id: 'user-123',
          community_code: 'lmr_x7k9p2',
        },
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_hour: -5 }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(400)
    })

    it('should prevent changing community_code (P0 security)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          owner_id: 'user-123',
          community_code: 'lmr_x7k9p2',
        },
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({
          price_per_hour: 10,
          community_code: 'malicious_code',
        }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Cannot change community_code')
    })
  })

  describe('Database Constraint Handling', () => {
    it('should return 400 for duplicate slot_number', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            slot_id: '123e4567-e89b-12d3-a456-426614174000',
            owner_id: 'user-123',
            community_code: 'lmr_x7k9p2',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'duplicate key' },
        })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({ slot_number: 'A-10' }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Slot number already exists')
    })
  })

  describe('Successful Update', () => {
    it('should update slot and return 200 with updated data', async () => {
      const slotId = '123e4567-e89b-12d3-a456-426614174000'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const updatedSlot = {
        slot_id: slotId,
        slot_number: 'A-10',
        slot_type: 'covered',
        price_per_hour: 10,
        owner_id: 'user-123',
        community_code: 'lmr_x7k9p2',
      }

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            slot_id: slotId,
            owner_id: 'user-123',
            community_code: 'lmr_x7k9p2',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedSlot,
          error: null,
        })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_hour: 10 }),
      })

      const response = await PATCH(req as NextRequest, {
        params: { id: slotId },
      })

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data).toEqual(updatedSlot)
    })
  })
})

describe('DELETE /api/slots/[id]', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
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

      const req = new Request('http://localhost/api/slots/123', {
        method: 'DELETE',
      })

      const response = await DELETE(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Ownership Verification', () => {
    it('should return 404 for non-existent slot', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'DELETE',
      })

      const response = await DELETE(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(404)
    })

    it('should return 403 when user does not own the slot', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: {
          slot_id: '123e4567-e89b-12d3-a456-426614174000',
          owner_id: 'other-user',
          community_code: 'lmr_x7k9p2',
        },
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'DELETE',
      })

      const response = await DELETE(req as NextRequest, {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })

      expect(response.status).toBe(403)
    })
  })

  describe('Active Booking Check', () => {
    it('should return 409 when slot has active bookings', async () => {
      const slotId = '123e4567-e89b-12d3-a456-426614174000'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      // Mock slot exists and user owns it
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: slotId,
          owner_id: 'user-123',
          community_code: 'lmr_x7k9p2',
        },
        error: null,
      })

      // Mock active bookings exist
      mockSupabase.limit.mockResolvedValue({
        data: [{ booking_id: 'active-booking' }],
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'DELETE',
      })

      const response = await DELETE(req as NextRequest, {
        params: { id: slotId },
      })

      expect(response.status).toBe(409)
      const json = await response.json()
      expect(json.error).toBe('Cannot delete slot with active bookings')
    })

    it('should allow deletion when only cancelled bookings exist', async () => {
      const slotId = '123e4567-e89b-12d3-a456-426614174000'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: slotId,
          owner_id: 'user-123',
          community_code: 'lmr_x7k9p2',
        },
        error: null,
      })

      // Mock no active bookings (only cancelled)
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      })

      mockSupabase.update = jest.fn().mockReturnThis()
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'DELETE',
      })

      const response = await DELETE(req as NextRequest, {
        params: { id: slotId },
      })

      expect(response.status).toBe(204)
      expect(mockSupabase.neq).toHaveBeenCalledWith('status', 'cancelled')
    })
  })

  describe('Soft Delete Behavior', () => {
    it('should soft delete (status=deleted) instead of hard delete', async () => {
      const slotId = '123e4567-e89b-12d3-a456-426614174000'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: slotId,
          owner_id: 'user-123',
          community_code: 'lmr_x7k9p2',
        },
        error: null,
      })

      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      })

      mockSupabase.update = jest.fn().mockReturnThis()
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'DELETE',
      })

      await DELETE(req as NextRequest, {
        params: { id: slotId },
      })

      // Verify soft delete (UPDATE, not DELETE)
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'deleted' })
      expect(mockSupabase.eq).toHaveBeenCalledWith('slot_id', slotId)
    })

    it('should return 204 No Content on successful deletion', async () => {
      const slotId = '123e4567-e89b-12d3-a456-426614174000'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          slot_id: slotId,
          owner_id: 'user-123',
          community_code: 'lmr_x7k9p2',
        },
        error: null,
      })

      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      })

      mockSupabase.update = jest.fn().mockReturnThis()
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null,
      })

      const req = new Request('http://localhost/api/slots/123', {
        method: 'DELETE',
      })

      const response = await DELETE(req as NextRequest, {
        params: { id: slotId },
      })

      expect(response.status).toBe(204)
      expect(response.body).toBeNull()
    })
  })
})
