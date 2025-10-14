/**
 * TEST-A001: AuthWrapper Component (COMPREHENSIVE)
 * Priority: P0 (Critical)
 * Source: tests_20251007-090752.md lines 1040-1117
 * Updated: 2025-10-07 - Full coverage implementation
 */

import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import AuthWrapper, { useAuth } from '@/components/auth/AuthWrapper'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
const mockGetSession = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockFrom = jest.fn()
const mockOnAuthStateChange = jest.fn()
const mockUnsubscribe = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  })),
}))

describe('AuthWrapper Component (TEST-A001 - COMPREHENSIVE)', () => {
  const mockPush = jest.fn()
  let authCallback: any = null

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup router mock
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })

    // Setup Supabase query chain
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    // Setup auth state change listener
    mockOnAuthStateChange.mockImplementation((callback: any) => {
      authCallback = callback
      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      }
    })
  })

  // ============================================================================
  // TEST GROUP 1: Loading States
  // ============================================================================

  describe('Loading States', () => {
    it('renders loading spinner initially', () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })

      render(
        <AuthWrapper>
          <div>Protected Content</div>
        </AuthWrapper>
      )

      // Check for loading spinner
      const loadingSpinner = document.querySelector('.animate-spin')
      expect(loadingSpinner).toBeInTheDocument()
    })

    it('shows profile loading when user exists but profile is loading', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      // Profile fetch is slow
      mockSingle.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ data: null, error: null }), 100)
      }))

      render(
        <AuthWrapper>
          <div>Protected Content</div>
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Loading your profile...')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 2: Unauthenticated User - Redirect to Login
  // ============================================================================

  describe('Unauthenticated User', () => {
    it('redirects to login when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })

      render(
        <AuthWrapper>
          <div>Protected Content</div>
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      expect(screen.getByText('Redirecting to login...')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('does not render children when unauthenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })

      render(
        <AuthWrapper>
          <div data-testid="protected">Protected Content</div>
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // TEST GROUP 3: Authenticated User - Render Children
  // ============================================================================

  describe('Authenticated User', () => {
    it('renders children when user has session and profile', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        phone: '+639171234567',
        unit_number: '10A',
      }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      render(
        <AuthWrapper>
          <div data-testid="protected">Protected Content</div>
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected')).toBeInTheDocument()
      })

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('provides auth context to children', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        phone: '+639171234567',
        unit_number: '10A',
      }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      function TestComponent() {
        const { user, profile, loading } = useAuth()
        return (
          <div>
            <div data-testid="user-email">{user?.email}</div>
            <div data-testid="profile-name">{profile?.name}</div>
            <div data-testid="loading">{loading ? 'Loading' : 'Ready'}</div>
          </div>
        )
      }

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('profile-name')).toHaveTextContent('John Doe')
        expect(screen.getByTestId('loading')).toHaveTextContent('Ready')
      })
    })
  })

  // ============================================================================
  // TEST GROUP 4: Profile Fetching
  // ============================================================================

  describe('Profile Fetching', () => {
    it('fetches profile on mount when session exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        phone: '+639171234567',
        unit_number: '10A',
      }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      render(
        <AuthWrapper>
          <div>Protected</div>
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('user_profiles')
        expect(mockSelect).toHaveBeenCalledWith('*')
        expect(mockEq).toHaveBeenCalledWith('id', 'user-123')
        expect(mockSingle).toHaveBeenCalled()
      })
    })

    it('does not fetch profile when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })

      render(
        <AuthWrapper>
          <div>Protected</div>
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // TEST GROUP 5: Auth State Changes
  // ============================================================================

  describe('Auth State Changes', () => {
    it('handles SIGNED_OUT event', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        phone: '+639171234567',
        unit_number: '10A',
      }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      render(
        <AuthWrapper>
          <div data-testid="protected">Protected</div>
        </AuthWrapper>
      )

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('protected')).toBeInTheDocument()
      })

      // Trigger SIGNED_OUT event
      act(() => {
        authCallback('SIGNED_OUT', null)
      })

      // Should redirect to login
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('handles SIGNED_IN event and fetches profile', async () => {
      const mockUser = { id: 'user-456', email: 'newuser@example.com' }
      const mockProfile = {
        id: 'user-456',
        name: 'Jane Doe',
        email: 'newuser@example.com',
        phone: '+639171234568',
        unit_number: '20B',
      }

      // Start with no session
      mockGetSession.mockResolvedValue({
        data: { session: null },
      })

      render(
        <AuthWrapper>
          <div>Protected</div>
        </AuthWrapper>
      )

      // Wait for redirect
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      // Reset mock for new profile fetch
      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      // Trigger SIGNED_IN event
      await act(async () => {
        await authCallback('SIGNED_IN', { user: mockUser })
      })

      // Should fetch profile
      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('user_profiles')
        expect(mockEq).toHaveBeenCalledWith('id', 'user-456')
      })
    })

    it('handles TOKEN_REFRESHED event', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        phone: '+639171234567',
        unit_number: '10A',
      }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      function TestComponent() {
        const { user } = useAuth()
        return <div data-testid="user-id">{user?.id}</div>
      }

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
      })

      const fetchCallsBefore = mockFrom.mock.calls.length

      // Trigger TOKEN_REFRESHED event
      const refreshedUser = { id: 'user-123', email: 'test@example.com', updated: true }
      act(() => {
        authCallback('TOKEN_REFRESHED', { user: refreshedUser })
      })

      // Should NOT fetch profile again (profile doesn't change on refresh)
      const fetchCallsAfter = mockFrom.mock.calls.length
      expect(fetchCallsAfter).toBe(fetchCallsBefore)
    })
  })

  // ============================================================================
  // TEST GROUP 6: useAuth Hook
  // ============================================================================

  describe('useAuth Hook', () => {
    it('throws error when used outside AuthWrapper', () => {
      function TestComponent() {
        useAuth()
        return <div>Test</div>
      }

      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth must be used within AuthWrapper')

      consoleError.mockRestore()
    })

    it('returns auth context when used inside AuthWrapper', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        phone: '+639171234567',
        unit_number: '10A',
      }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      function TestComponent() {
        const context = useAuth()
        expect(context).toHaveProperty('user')
        expect(context).toHaveProperty('profile')
        expect(context).toHaveProperty('loading')
        return <div>Test</div>
      }

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 7: Cleanup
  // ============================================================================

  describe('Cleanup', () => {
    it('unsubscribes from auth listener on unmount', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        phone: '+639171234567',
        unit_number: '10A',
      }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      const { unmount } = render(
        <AuthWrapper>
          <div>Protected</div>
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Protected')).toBeInTheDocument()
      })

      // Unmount component
      unmount()

      // Should have unsubscribed
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // TEST GROUP 8: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('handles getSession error gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      mockGetSession.mockRejectedValue(new Error('Session fetch failed'))

      render(
        <AuthWrapper>
          <div>Protected</div>
        </AuthWrapper>
      )

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Auth initialization error:',
          expect.any(Error)
        )
      })

      // Should still stop loading and redirect
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      consoleError.mockRestore()
    })

    it('handles profile fetch error gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      })

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      })

      render(
        <AuthWrapper>
          <div>Protected</div>
        </AuthWrapper>
      )

      // Should show profile loading state (profile is null)
      await waitFor(() => {
        expect(screen.getByText('Loading your profile...')).toBeInTheDocument()
      })
    })
  })
})
