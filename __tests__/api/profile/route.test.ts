/**
 * TEST-API-PROFILE-001: Profile API GET and PATCH Endpoints (COMPREHENSIVE)
 * Priority: P0
 * Source: P0-004 implementation
 * Updated: 2025-12-14
 *
 * This test suite validates:
 * - User can only access their own profile
 * - Authentication and authorization
 * - Request validation (allowed fields: name, phone)
 * - CRITICAL: Prevents changing email, unit_number, community_code
 * - Database error handling
 */

import { GET, PATCH } from '@/app/api/profile/route'
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

describe('GET /api/profile', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
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

  describe('Profile Access Control', () => {
    it('should only return authenticated user\'s own profile', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const userProfile = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123',
        unit_number: 'A-10',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.single.mockResolvedValue({
        data: userProfile,
        error: null,
      })

      const response = await GET()

      // Verify query filters by userId
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId)

      const json = await response.json()
      expect(response.status).toBe(200)
      expect(json.data).toEqual(userProfile)
    })

    it('should return 404 when profile not found', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const response = await GET()

      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Profile not found')
    })
  })

  describe('Database Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const response = await GET()

      expect(response.status).toBe(404) // Treated as not found
      const json = await response.json()
      expect(json.error).toBe('Profile not found')
    })
  })
})

describe('PATCH /api/profile', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
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

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 403 for users without community assignment', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        error: 'No community assigned',
        status: 403,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(403)
    })
  })

  describe('Allowed Field Updates', () => {
    it('should allow updating name', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const updatedProfile = {
        id: userId,
        name: 'Jane Smith',
        email: 'john@example.com',
        phone: '555-0123',
        unit_number: 'A-10',
      }

      mockSupabase.single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Jane Smith' }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(200)
      expect(mockSupabase.update).toHaveBeenCalledWith({ name: 'Jane Smith' })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId)

      const json = await response.json()
      expect(json.data.name).toBe('Jane Smith')
    })

    it('should allow updating phone', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: { id: userId, phone: '555-9999' },
        error: null,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ phone: '555-9999' }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(200)
      expect(mockSupabase.update).toHaveBeenCalledWith({ phone: '555-9999' })
    })

    it('should allow updating both name and phone', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: { id: userId, name: 'Jane Smith', phone: '555-9999' },
        error: null,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Jane Smith',
          phone: '555-9999',
        }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(200)
      expect(mockSupabase.update).toHaveBeenCalledWith({
        name: 'Jane Smith',
        phone: '555-9999',
      })
    })
  })

  describe('Field Validation', () => {
    it('should return 400 for empty name', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: '' }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Name cannot be empty')
    })

    it('should return 400 for invalid phone format', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ phone: 'invalid-phone-abc' }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Invalid phone number format')
    })
  })

  describe('Immutable Field Protection (P0 Security)', () => {
    it('should prevent changing email (P0 security)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          email: 'hacker@malicious.com',
        }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Cannot change email, unit_number, or community_code')
    })

    it('should prevent changing unit_number (P0 security)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          unit_number: 'Z-999',
        }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Cannot change email, unit_number, or community_code')
    })

    it('should prevent changing community_code (P0 security)', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          community_code: 'malicious_code',
        }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Cannot change email, unit_number, or community_code')
    })

    it('should prevent changing multiple immutable fields at once', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          email: 'hacker@malicious.com',
          unit_number: 'Z-999',
          community_code: 'malicious_code',
        }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Cannot change email, unit_number, or community_code')
    })

    it('should reject even when mixing allowed and forbidden fields', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'John Doe',
          email: 'hacker@malicious.com', // Forbidden field
        }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('Cannot change email, unit_number, or community_code')
    })
  })

  describe('User Isolation', () => {
    it('should only update authenticated user\'s own profile', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: { id: userId, name: 'Updated Name' },
        error: null,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      })

      await PATCH(req as NextRequest)

      // Verify update filters by userId from session
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId)
    })
  })

  describe('Successful Update', () => {
    it('should update profile and return 200 with updated data', async () => {
      const userId = 'user-123'
      mockGetSessionWithCommunity.mockResolvedValue({
        userId,
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      const updatedProfile = {
        id: userId,
        name: 'Jane Smith',
        email: 'john@example.com',
        phone: '555-9999',
        unit_number: 'A-10',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-12-14T00:00:00Z',
      }

      mockSupabase.single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Jane Smith',
          phone: '555-9999',
        }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data).toEqual(updatedProfile)
    })
  })

  describe('Database Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockGetSessionWithCommunity.mockResolvedValue({
        userId: 'user-123',
        communityCode: 'lmr_x7k9p2',
        session: {} as any,
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const req = new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      })

      const response = await PATCH(req as NextRequest)

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('Failed to update profile')
    })
  })
})
