/**
 * TEST-R004: Browse Slots Page (COMPREHENSIVE)
 * Priority: P0 (Critical)
 * Source: tests_20251007-090752.md lines 258-353
 * Updated: 2025-10-09 - Full coverage implementation
 */

import { render, screen, waitFor } from '@testing-library/react'
import SlotsPage from '@/app/LMR/slots/page'

// CommunityContext mock removed (no longer needed in minimal MVP)

// Mock Navigation component
jest.mock('@/components/common/Navigation', () => {
  return function MockNavigation() {
    return <nav data-testid="navigation">Navigation</nav>
  }
})

// Mock AuthWrapper
jest.mock('@/components/auth/AuthWrapper', () => {
  return function MockAuthWrapper({ children }: { children: React.ReactNode }) {
    return <div data-testid="auth-wrapper">{children}</div>
  }
})

// Mock Supabase client
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

describe('Browse Slots Page (TEST-R004 - COMPREHENSIVE)', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default query chain
    mockOrder.mockResolvedValue({ data: [], error: null })
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  // ============================================================================
  // TEST GROUP 1: Page Structure
  // ============================================================================

  describe('Page Structure', () => {
    it('renders navigation component', async () => {
      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByTestId('navigation')).toBeInTheDocument()
      })
    })

    // Slots page is now public (no AuthWrapper) for MVP
    it.skip('wraps content in AuthWrapper', async () => {
      render(<SlotsPage />)

      expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument()
    })

    it('renders page heading', async () => {
      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText('Available Parking Slots')).toBeInTheDocument()
      })
    })

    it('renders "List Your Slot" button', async () => {
      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /list your slot/i })).toHaveAttribute(
          'href',
          '/LMR/slots/new'
        )
      })
    })
  })

  // ============================================================================
  // TEST GROUP 2: Loading State
  // ============================================================================

  describe('Loading State', () => {
    it('displays loading spinner initially', () => {
      // Make query slow
      mockOrder.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: [], error: null }), 100)
        })
      })

      render(<SlotsPage />)

      // Check for loading spinner
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('hides loading spinner after data loads', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin')
        expect(spinner).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 3: Data Fetching
  // ============================================================================

  describe('Data Fetching', () => {
    it('fetches slots from Supabase on mount', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('parking_slots')
        expect(mockSelect).toHaveBeenCalled()
        expect(mockEq).toHaveBeenCalledWith('status', 'active')
        expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      })
    })

    it('filters only active slots', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(mockEq).toHaveBeenCalledWith('status', 'active')
      })
    })

    it('orders slots by created_at descending', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      })
    })
  })

  // ============================================================================
  // TEST GROUP 4: Slot List Rendering
  // ============================================================================

  describe('Slot List Rendering', () => {
    it('renders slot cards when data is available', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-10',
          slot_type: 'covered',
          description: 'Near elevator',
          price_per_hour: 50,
          status: 'active',
          user_profiles: {
            name: 'John Doe',
            phone: '+639171234567',
          },
        },
        {
          slot_id: 2,
          slot_number: 'B-05',
          slot_type: 'uncovered',
          description: 'Corner slot',
          price_per_hour: 30,
          status: 'active',
          user_profiles: {
            name: 'Jane Smith',
            phone: '+639181234567',
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText('Slot A-10')).toBeInTheDocument()
        expect(screen.getByText('Slot B-05')).toBeInTheDocument()
      })
    })

    it('displays slot prices correctly', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-10',
          slot_type: 'covered',
          description: null,
          price_per_hour: 50,
          status: 'active',
          user_profiles: null,
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText('₱50/hr')).toBeInTheDocument()
      })
    })

    it('displays slot type', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-10',
          slot_type: 'covered',
          description: null,
          price_per_hour: 50,
          status: 'active',
          user_profiles: null,
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText('covered')).toBeInTheDocument()
      })
    })

    it('displays slot description when available', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-10',
          slot_type: 'covered',
          description: 'Near elevator, easy access',
          price_per_hour: 50,
          status: 'active',
          user_profiles: null,
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText('Near elevator, easy access')).toBeInTheDocument()
      })
    })

    it('displays owner name when available', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-10',
          slot_type: 'covered',
          description: null,
          price_per_hour: 50,
          status: 'active',
          user_profiles: {
            name: 'John Doe',
            phone: '+639171234567',
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText(/Owner: John Doe/i)).toBeInTheDocument()
      })
    })

    it('renders "Book Now" button for each slot', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-10',
          slot_type: 'covered',
          description: null,
          price_per_hour: 50,
          status: 'active',
          user_profiles: null,
        },
        {
          slot_id: 2,
          slot_number: 'B-05',
          slot_type: 'uncovered',
          description: null,
          price_per_hour: 30,
          status: 'active',
          user_profiles: null,
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        const bookButtons = screen.getAllByText('Book Now')
        expect(bookButtons).toHaveLength(2)
      })
    })

    it('links each slot card to detail page', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-10',
          slot_type: 'covered',
          description: null,
          price_per_hour: 50,
          status: 'active',
          user_profiles: null,
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        const slotCard = screen.getByText('Slot A-10').closest('a')
        expect(slotCard).toHaveAttribute('href', '/LMR/slots/1')
      })
    })
  })

  // ============================================================================
  // TEST GROUP 5: Empty State
  // ============================================================================

  describe('Empty State', () => {
    it('displays empty state when no slots available', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText('No slots available yet.')).toBeInTheDocument()
      })
    })

    it('shows "Be the first" button in empty state', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        const button = screen.getByRole('link', { name: /be the first to list one/i })
        expect(button).toHaveAttribute('href', '/LMR/slots/new')
      })
    })

    it('does not show slot grid in empty state', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        const grid = document.querySelector('.grid')
        expect(grid).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 6: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('displays error message when fetch fails', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText(/Error loading slots:/i)).toBeInTheDocument()
        expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument()
      })
    })

    it('hides loading spinner on error', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      render(<SlotsPage />)

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin')
        expect(spinner).not.toBeInTheDocument()
      })
    })

    it('does not render slots on error', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.queryByText('Slot A-10')).not.toBeInTheDocument()
      })
    })
  })
})
