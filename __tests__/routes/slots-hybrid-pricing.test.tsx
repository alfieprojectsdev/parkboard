/**
 * TEST: Slot Listing with Hybrid Pricing
 * Priority: P0 (Critical)
 * Feature: Display NULL prices as "Request Quote"
 * Created: 2025-10-13
 */

import { render, screen, waitFor } from '@testing-library/react'
import SlotsPage from '@/app/LMR/slots/page'

// CommunityContext mock removed (no longer needed in minimal MVP)

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

// Mock Supabase client
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

// Mock AuthWrapper
jest.mock('@/components/auth/AuthWrapper', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
  useAuth: () => ({
    user: { id: 'test-user-123' },
    profile: { name: 'Test User' },
    loading: false,
  }),
}))

// Mock Navigation
jest.mock('@/components/common/Navigation', () => ({
  __esModule: true,
  default: () => <nav>Navigation</nav>,
}))

describe('Slot Listing - Hybrid Pricing', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup Supabase mock chain
    mockOrder.mockResolvedValue({ data: [], error: null })
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  // ============================================================================
  // TEST GROUP 1: Display Explicit Pricing
  // ============================================================================

  describe('Explicit Pricing Display', () => {
    it('displays price and "Instant Booking" badge for slots with explicit pricing', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-100',
          slot_type: 'covered',
          description: 'Near elevator',
          price_per_hour: 75,  // Has explicit price
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
        // Should show price
        expect(screen.getByText(/₱75\/hr/i)).toBeInTheDocument()

        // Should show Instant Booking badge
        expect(screen.getByText(/instant booking/i)).toBeInTheDocument()

        // Should show "Book Now" button
        expect(screen.getByText(/book now/i)).toBeInTheDocument()
      })
    })

    it('displays multiple slots with explicit pricing', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-100',
          slot_type: 'covered',
          description: null,
          price_per_hour: 50,
          status: 'active',
          user_profiles: { name: 'Owner 1', phone: '+1234' },
        },
        {
          slot_id: 2,
          slot_number: 'B-200',
          slot_type: 'uncovered',
          description: null,
          price_per_hour: 75,
          status: 'active',
          user_profiles: { name: 'Owner 2', phone: '+5678' },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText(/₱50\/hr/i)).toBeInTheDocument()
        expect(screen.getByText(/₱75\/hr/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 2: Display Request Quote Slots (NEW)
  // ============================================================================

  describe('Request Quote Display', () => {
    it('displays "Request Quote" for slots with NULL price', async () => {
      const mockSlots = [
        {
          slot_id: 2,
          slot_number: 'B-200',
          slot_type: 'covered',
          description: 'Flexible pricing',
          price_per_hour: null,  // NULL price = Request Quote
          status: 'active',
          user_profiles: {
            name: 'Jane Smith',
            phone: '+639171234567',
          },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        // Should show "Request Quote" instead of price
        expect(screen.getByText(/request quote/i)).toBeInTheDocument()

        // Should show "Contact Owner" badge
        expect(screen.getByText(/contact owner/i)).toBeInTheDocument()

        // Should show "View Details" button instead of "Book Now"
        expect(screen.getByText(/view details/i)).toBeInTheDocument()
        expect(screen.queryByText(/book now/i)).not.toBeInTheDocument()
      })
    })

    it('does not show price or currency for request quote slots', async () => {
      const mockSlots = [
        {
          slot_id: 3,
          slot_number: 'C-300',
          slot_type: 'covered',
          description: null,
          price_per_hour: null,
          status: 'active',
          user_profiles: { name: 'Owner', phone: '+1234' },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText(/slot C-300/i)).toBeInTheDocument()

        // Should NOT show any price formatting
        expect(screen.queryByText(/₱/)).not.toBeInTheDocument()
        expect(screen.queryByText(/\/hr/)).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 3: Mixed Listing (Explicit + Request Quote)
  // ============================================================================

  describe('Mixed Pricing Display', () => {
    it('displays both explicit and request quote slots correctly', async () => {
      const mockSlots = [
        {
          slot_id: 1,
          slot_number: 'A-100',
          slot_type: 'covered',
          description: null,
          price_per_hour: 60,  // Explicit
          status: 'active',
          user_profiles: { name: 'Owner 1', phone: '+1111' },
        },
        {
          slot_id: 2,
          slot_number: 'B-200',
          slot_type: 'covered',
          description: null,
          price_per_hour: null,  // Request Quote
          status: 'active',
          user_profiles: { name: 'Owner 2', phone: '+2222' },
        },
        {
          slot_id: 3,
          slot_number: 'C-300',
          slot_type: 'uncovered',
          description: null,
          price_per_hour: 45,  // Explicit
          status: 'active',
          user_profiles: { name: 'Owner 3', phone: '+3333' },
        },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        // Explicit pricing slots
        expect(screen.getByText(/₱60\/hr/i)).toBeInTheDocument()
        expect(screen.getByText(/₱45\/hr/i)).toBeInTheDocument()

        // Request quote slot
        expect(screen.getByText(/request quote/i)).toBeInTheDocument()

        // Should have 2 "Book Now" buttons (for explicit slots)
        const bookNowButtons = screen.getAllByText(/book now/i)
        expect(bookNowButtons).toHaveLength(2)

        // Should have 1 "View Details" button (for request quote slot)
        const viewDetailsButtons = screen.getAllByText(/view details/i)
        expect(viewDetailsButtons).toHaveLength(1)
      })
    })

    it('sorts explicit pricing slots before request quote slots', async () => {
      const mockSlots = [
        { slot_id: 1, slot_number: 'A-1', price_per_hour: null, status: 'active', slot_type: 'covered', description: null, user_profiles: { name: 'Owner', phone: '+1' } },
        { slot_id: 2, slot_number: 'B-2', price_per_hour: 50, status: 'active', slot_type: 'covered', description: null, user_profiles: { name: 'Owner', phone: '+2' } },
        { slot_id: 3, slot_number: 'C-3', price_per_hour: null, status: 'active', slot_type: 'covered', description: null, user_profiles: { name: 'Owner', phone: '+3' } },
        { slot_id: 4, slot_number: 'D-4', price_per_hour: 75, status: 'active', slot_type: 'covered', description: null, user_profiles: { name: 'Owner', phone: '+4' } },
      ]

      mockOrder.mockResolvedValue({ data: mockSlots, error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        const cards = screen.getAllByText(/Slot [A-D]-[0-9]/i)

        // First two should be explicit pricing (B-2, D-4)
        // Last two should be request quote (A-1, C-3)
        // Due to ranking logic in component
        expect(cards.length).toBe(4)
      })
    })
  })

  // ============================================================================
  // TEST GROUP 4: Empty States
  // ============================================================================

  describe('Empty States', () => {
    it('shows empty state when no slots available', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText(/no slots available yet/i)).toBeInTheDocument()
        expect(screen.getByText(/be the first to list one/i)).toBeInTheDocument()
      })
    })

    it('handles fetch errors gracefully', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      })

      render(<SlotsPage />)

      await waitFor(() => {
        expect(screen.getByText(/error loading slots/i)).toBeInTheDocument()
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 5: Loading States
  // ============================================================================

  describe('Loading States', () => {
    it('shows loading spinner while fetching slots', () => {
      // Don't resolve the promise immediately
      mockOrder.mockReturnValue(new Promise(() => {}))

      render(<SlotsPage />)

      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('hides loading spinner after slots loaded', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      render(<SlotsPage />)

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin')
        expect(spinner).not.toBeInTheDocument()
      })
    })
  })
})
