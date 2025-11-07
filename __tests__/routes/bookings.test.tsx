/**
 * TEST-R006: My Bookings Page (COMPREHENSIVE)
 * Priority: P0 (Critical)
 * Source: tests_20251007-090752.md lines 474-571
 * Updated: 2025-10-09 - Full coverage implementation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BookingsPage from '@/app/LMR/bookings/page'

// CommunityContext mock removed (no longer needed in minimal MVP)

// Mock Navigation
jest.mock('@/components/common/Navigation', () => {
  return function MockNavigation() {
    return <nav data-testid="navigation">Navigation</nav>
  }
})

// Mock AuthWrapper and useAuth
const mockUseAuth = jest.fn()
jest.mock('@/components/auth/AuthWrapper', () => ({
  __esModule: true,
  default: function MockAuthWrapper({ children }: { children: React.ReactNode }) {
    return <div data-testid="auth-wrapper">{children}</div>
  },
  useAuth: () => mockUseAuth(),
}))

// Mock Supabase
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockUpdate = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

// Mock window.confirm
global.confirm = jest.fn()

describe('My Bookings Page (TEST-R006 - COMPREHENSIVE)', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      profile: null,
      loading: false,
    })

    mockOrder.mockResolvedValue({ data: [], error: null })
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockUpdate.mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: mockSelect,
          update: () => ({ eq: () => ({ eq: mockEq }) }),
        }
      }
      return { select: mockSelect }
    })
  })

  // ============================================================================
  // TEST GROUP 1: Empty State
  // ============================================================================

  describe('Empty State', () => {
    it('displays empty state when no bookings', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<BookingsPage />)

      await waitFor(() => {
        expect(screen.getByText(/You haven't made any bookings yet/i)).toBeInTheDocument()
      })
    })

    it('shows browse slots button in empty state', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<BookingsPage />)

      await waitFor(() => {
        const button = screen.getByRole('link', { name: /browse available slots/i })
        expect(button).toHaveAttribute('href', '/LMR/slots')
      })
    })
  })

  // ============================================================================
  // TEST GROUP 2: Bookings List
  // ============================================================================

  describe('Bookings List', () => {
    it('displays booking cards', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'pending',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })

      render(<BookingsPage />)

      await waitFor(() => {
        expect(screen.getByText('Slot A-10')).toBeInTheDocument()
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.getByText('₱100.00')).toBeInTheDocument()
      })
    })

    it('displays booking status badge', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'confirmed',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })

      render(<BookingsPage />)

      await waitFor(() => {
        expect(screen.getByText(/confirmed/i)).toBeInTheDocument()
      })
    })

    it('displays owner contact information', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'pending',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })

      render(<BookingsPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('+639171234567')).toBeInTheDocument()
      })
    })

    it('formats dates correctly', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'pending',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })

      render(<BookingsPage />)

      await waitFor(() => {
        // Check that dates are formatted (checking for month name)
        const dates = screen.getAllByText(/Oct/)
        expect(dates.length).toBeGreaterThan(0)
      })
    })
  })

  // ============================================================================
  // TEST GROUP 3: Cancel Booking
  // ============================================================================

  describe('Cancel Booking', () => {
    it('shows cancel button for pending bookings', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'pending',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })

      render(<BookingsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel booking/i })).toBeInTheDocument()
      })
    })

    it('does not show cancel button for confirmed bookings', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'confirmed',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })

      render(<BookingsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument()
      })
    })

    it('prompts for confirmation before cancelling', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'pending',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })
      ;(global.confirm as jest.Mock).mockReturnValue(true)

      render(<BookingsPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel booking/i }))
      })

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to cancel this booking?')
    })

    it('cancels booking when confirmed', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'pending',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })
      ;(global.confirm as jest.Mock).mockReturnValue(true)

      const mockEqChain = jest.fn().mockResolvedValue({ error: null })
      mockFrom.mockReturnValue({
        select: mockSelect,
        update: () => ({ eq: () => ({ eq: mockEqChain }) }),
      })

      render(<BookingsPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel booking/i }))
      })

      await waitFor(() => {
        expect(mockEqChain).toHaveBeenCalled()
      })
    })

    it('updates UI after cancellation', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'pending',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })
      ;(global.confirm as jest.Mock).mockReturnValue(true)

      const mockEqChain = jest.fn().mockResolvedValue({ error: null })
      mockFrom.mockReturnValue({
        select: mockSelect,
        update: () => ({ eq: () => ({ eq: mockEqChain }) }),
      })

      render(<BookingsPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel booking/i }))
      })

      await waitFor(() => {
        expect(screen.getByText(/cancelled/i)).toBeInTheDocument()
      })
    })

    it('does not cancel if user declines confirmation', async () => {
      const mockBookings = [
        {
          booking_id: 1,
          start_time: '2025-10-10T10:00:00',
          end_time: '2025-10-10T12:00:00',
          total_price: 100,
          status: 'pending',
          created_at: '2025-10-09T10:00:00',
          parking_slots: {
            slot_number: 'A-10',
            user_profiles: {
              name: 'John Doe',
              phone: '+639171234567',
            },
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockBookings, error: null })
      ;(global.confirm as jest.Mock).mockReturnValue(false)

      const mockEqChain = jest.fn().mockResolvedValue({ error: null })
      mockFrom.mockReturnValue({
        select: mockSelect,
        update: () => ({ eq: () => ({ eq: mockEqChain }) }),
      })

      render(<BookingsPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel booking/i }))
      })

      expect(mockEqChain).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // TEST GROUP 4: Loading and Error States
  // ============================================================================

  describe('Loading and Error States', () => {
    it('displays loading spinner initially', () => {
      mockOrder.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: [], error: null }), 100)
        })
      })

      render(<BookingsPage />)

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('displays error message on fetch failure', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      render(<BookingsPage />)

      await waitFor(() => {
        expect(screen.getByText(/Error loading bookings:/i)).toBeInTheDocument()
        expect(screen.getByText(/Database error/i)).toBeInTheDocument()
      })
    })
  })
})
