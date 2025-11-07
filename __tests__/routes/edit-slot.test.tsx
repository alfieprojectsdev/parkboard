/**
 * TEST-R014: Edit Slot Page (COMPREHENSIVE)
 * Priority: P0 (Critical - Phase 2 Feature)
 * Created: 2025-10-17
 * Feature: Slot editing with ownership verification and active booking checks
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import EditSlotPage from '@/app/LMR/slots/[slotId]/edit/page'

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

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// Mock Supabase
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockIn = jest.fn()
const mockGte = jest.fn()
const mockSingle = jest.fn()
const mockUpdate = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

// Test data
const mockSlotData = {
  slot_id: 123,
  owner_id: 'user-123',
  slot_number: 'A-101',
  slot_type: 'covered',
  description: 'Near elevator, well-lit',
  price_per_hour: 50,
  status: 'active',
  // community_code removed (column no longer exists in minimal MVP)
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
}

describe('Edit Slot Page (TEST-R014 - COMPREHENSIVE)', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useParams as jest.Mock).mockReturnValue({ slotId: '123' })

    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      profile: null,
      loading: false,
    })

    // Default: successful slot fetch and no active bookings
    mockSingle.mockResolvedValue({ data: mockSlotData, error: null })

    // Setup mock chains
    // Update chain needs to handle TWO .eq() calls: .eq('slot_id', ...).eq('owner_id', ...)
    const secondEqMock = jest.fn().mockResolvedValue({ error: null })
    const firstEqMock = jest.fn().mockReturnValue({ eq: secondEqMock })

    const mockUpdateChain = {
      eq: firstEqMock,
    }

    const mockBookingSelectChain = {
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data: [], error: null }),
    }

    const mockSlotSelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: mockSingle,
    }

    mockSelect.mockImplementation((fields: string) => {
      if (fields === 'booking_id') {
        return mockBookingSelectChain
      }
      return mockSlotSelectChain
    })

    mockUpdate.mockReturnValue(mockUpdateChain)

    // Store the eq mocks for individual test access
    mockEq.mockImplementation((field: string, value: any) => {
      if (field === 'slot_id') {
        return { eq: secondEqMock }
      }
      return Promise.resolve({ error: null })
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return { select: mockSelect }
      }
      if (table === 'parking_slots') {
        return {
          select: mockSelect,
          update: mockUpdate,
        }
      }
      return { select: mockSelect, update: mockUpdate }
    })
  })

  // ============================================================================
  // TEST GROUP 1: Initial Loading & Data Fetching
  // ============================================================================

  describe('Initial Loading & Data Fetching', () => {
    it('shows loading spinner while fetching slot data', () => {
      render(<EditSlotPage />)
      expect(screen.getByText(/Loading slot details\.\.\./i)).toBeInTheDocument()
    })

    it('fetches slot data with correct parameters', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('parking_slots')
        expect(mockSelect).toHaveBeenCalledWith('*')
      })
    })

    it('pre-fills form with existing slot data (explicit pricing)', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Slot Type/i)).toHaveValue('covered')
        expect(screen.getByLabelText(/Description/i)).toHaveValue('Near elevator, well-lit')
        expect(screen.getByLabelText(/Price Per Hour/i)).toHaveValue(50)
      })
    })

    it('pre-fills form with request quote pricing type', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockSlotData, price_per_hour: null },
        error: null,
      })

      render(<EditSlotPage />)

      await waitFor(() => {
        const requestQuoteRadio = screen.getByRole('radio', {
          name: /Request Quote/i,
        }) as HTMLInputElement
        expect(requestQuoteRadio.checked).toBe(true)
      })
    })

    it('displays slot number as read-only', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByText(/Slot Number:/i)).toBeInTheDocument()
        expect(screen.getByText('A-101')).toBeInTheDocument()
        expect(screen.getByText(/cannot be changed/i)).toBeInTheDocument()
      })
    })

    it('checks for active bookings on load', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('bookings')
        expect(mockSelect).toHaveBeenCalledWith('booking_id')
      })
    })
  })

  // ============================================================================
  // TEST GROUP 2: Ownership Verification
  // ============================================================================

  describe('Ownership Verification', () => {
    it('allows owner to edit their slot', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockSlotData, owner_id: 'user-123' },
        error: null,
      })

      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
      })
    })

    it('prevents non-owner from editing slot', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockSlotData, owner_id: 'different-user' },
        error: null,
      })

      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByText(/You can only edit your own slots/i)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument()
      })
    })

    it('shows error and back button for non-owner', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockSlotData, owner_id: 'different-user' },
        error: null,
      })

      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Back to Slots/i })).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 3: Active Booking Prevention
  // ============================================================================

  describe('Active Booking Prevention', () => {
    it('allows editing when no active bookings exist', async () => {
      mockSelect.mockImplementation((fields: string) => {
        if (fields === 'booking_id') {
          return {
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        }
      })

      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled()
      })
    })

    it('prevents editing when active bookings exist', async () => {
      mockSelect.mockImplementation((fields: string) => {
        if (fields === 'booking_id') {
          return {
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest
              .fn()
              .mockResolvedValue({ data: [{ booking_id: 1 }, { booking_id: 2 }], error: null }),
          }
        }
        return {
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        }
      })

      render(<EditSlotPage />)

      await waitFor(() => {
        expect(
          screen.getByText(/Cannot edit slot with 2 active booking\(s\)/i)
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument()
      })
    })

    it('shows helpful message about waiting for bookings to complete', async () => {
      mockSelect.mockImplementation((fields: string) => {
        if (fields === 'booking_id') {
          return {
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest.fn().mockResolvedValue({ data: [{ booking_id: 1 }], error: null }),
          }
        }
        return {
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
        }
      })

      render(<EditSlotPage />)

      await waitFor(() => {
        expect(
          screen.getByText(/Wait until bookings complete or cancel them first/i)
        ).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 4: Form Rendering
  // ============================================================================

  describe('Form Rendering', () => {
    it('renders all form fields', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Slot Type/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
        expect(screen.getByText(/Pricing Options/i)).toBeInTheDocument()
      })
    })

    it('renders pricing type radio buttons', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /Set Fixed Price/i })).toBeInTheDocument()
        expect(screen.getByRole('radio', { name: /Request Quote/i })).toBeInTheDocument()
      })
    })

    it('shows price input when explicit pricing selected', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Price Per Hour/i)).toBeInTheDocument()
      })
    })

    it('hides price input when request quote selected', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockSlotData, price_per_hour: null },
        error: null,
      })

      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.queryByLabelText(/Price Per Hour/i)).not.toBeInTheDocument()
      })
    })

    it('renders action buttons', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      })
    })

    it('shows helper text for pricing', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByText(/Suggested: ₱30-100\/hour/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 5: Form Input & Interaction
  // ============================================================================

  describe('Form Input & Interaction', () => {
    it('updates slot type on change', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        const select = screen.getByLabelText(/Slot Type/i) as HTMLSelectElement
        fireEvent.change(select, { target: { value: 'uncovered' } })
        expect(select.value).toBe('uncovered')
      })
    })

    it('updates description on change', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        const textarea = screen.getByLabelText(/Description/i) as HTMLTextAreaElement
        fireEvent.change(textarea, { target: { value: 'Updated description' } })
        expect(textarea.value).toBe('Updated description')
      })
    })

    it('toggles pricing type from explicit to request quote', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        const requestQuoteRadio = screen.getByRole('radio', { name: /Request Quote/i })
        fireEvent.click(requestQuoteRadio)

        expect(screen.queryByLabelText(/Price Per Hour/i)).not.toBeInTheDocument()
        expect(screen.getByText(/Request Quote Mode/i)).toBeInTheDocument()
      })
    })

    it('toggles pricing type from request quote to explicit', async () => {
      mockSingle.mockResolvedValue({
        data: { ...mockSlotData, price_per_hour: null },
        error: null,
      })

      render(<EditSlotPage />)

      await waitFor(() => {
        const explicitPricingRadio = screen.getByRole('radio', { name: /Set Fixed Price/i })
        fireEvent.click(explicitPricingRadio)

        expect(screen.getByLabelText(/Price Per Hour/i)).toBeInTheDocument()
      })
    })

    it('updates price when visible', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        const priceInput = screen.getByLabelText(/Price Per Hour/i) as HTMLInputElement
        fireEvent.change(priceInput, { target: { value: '60' } })
        expect(priceInput.value).toBe('60')
      })
    })
  })

  // ============================================================================
  // TEST GROUP 6: Form Validation
  // ============================================================================

  describe('Form Validation', () => {
    it('requires slot type', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        const slotTypeSelect = screen.getByLabelText(/Slot Type/i) as HTMLSelectElement
        expect(slotTypeSelect).toHaveAttribute('required')
      })
    })

    it('validates price is positive for explicit pricing', async () => {
      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Price Per Hour/i)).toBeInTheDocument()
      })

      const priceInput = screen.getByLabelText(/Price Per Hour/i) as HTMLInputElement
      fireEvent.change(priceInput, { target: { value: '-10' } })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/Price must be greater than 0/i)).toBeInTheDocument()
      })
    })

    it('accepts empty description', async () => {
      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
      })

      const textarea = screen.getByLabelText(/Description/i) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: '' } })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            description: null,
          })
        )
      })
    })

    it('trims whitespace from description', async () => {
      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
      })

      const textarea = screen.getByLabelText(/Description/i) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: '  Trimmed description  ' } })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Trimmed description',
          })
        )
      })
    })
  })

  // ============================================================================
  // TEST GROUP 7: Successful Update
  // ============================================================================

  describe('Successful Update', () => {
    it('submits update with correct data (explicit pricing)', async () => {
      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Slot Type/i)).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/Slot Type/i), {
        target: { value: 'tandem' },
      })
      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: 'Updated description' },
      })
      fireEvent.change(screen.getByLabelText(/Price Per Hour/i), {
        target: { value: '65' },
      })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            slot_type: 'tandem',
            description: 'Updated description',
            price_per_hour: 65,
          })
        )
      })
    })

    it('submits update with NULL price for request quote', async () => {
      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /Request Quote/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('radio', { name: /Request Quote/i }))

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            price_per_hour: null,
          })
        )
      })
    })

    it('includes updated_at timestamp', async () => {
      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            updated_at: expect.any(String),
          })
        )
      })
    })

    it('verifies ownership in update query', async () => {
      // Reset and create spy mocks
      const secondEqSpy = jest.fn().mockResolvedValue({ error: null })
      const firstEqSpy = jest.fn().mockReturnValue({ eq: secondEqSpy })

      mockUpdate.mockReturnValue({ eq: firstEqSpy })

      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        // Check both eq calls were made
        expect(firstEqSpy).toHaveBeenCalledWith('slot_id', 123)
        expect(secondEqSpy).toHaveBeenCalledWith('owner_id', 'user-123')
      })
    })

    it('redirects to slot detail page after success', async () => {
      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/LMR/slots/123')
      })
    })

    it('shows loading state during submission', async () => {
      // Create delayed resolution for second .eq()
      const secondEqMock = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ error: null }), 100)
        })
      })
      const firstEqMock = jest.fn().mockReturnValue({ eq: secondEqMock })

      mockUpdate.mockReturnValue({ eq: firstEqMock })

      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/Saving Changes\.\.\./i)).toBeInTheDocument()
      })
    })

    it('disables buttons during submission', async () => {
      // Create delayed resolution for second .eq()
      const secondEqMock = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ error: null }), 100)
        })
      })
      const firstEqMock = jest.fn().mockReturnValue({ eq: secondEqMock })

      mockUpdate.mockReturnValue({ eq: firstEqMock })

      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Saving Changes\.\.\./i })).toBeDisabled()
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 8: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('displays error when slot not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Slot not found' } })

      render(<EditSlotPage />)

      await waitFor(() => {
        expect(screen.getByText(/Slot not found/i)).toBeInTheDocument()
      })
    })

    it('displays database error on update failure', async () => {
      // Create error-returning chain
      const secondEqMock = jest.fn().mockResolvedValue({
        error: { message: 'Database connection failed' },
      })
      const firstEqMock = jest.fn().mockReturnValue({ eq: secondEqMock })

      mockUpdate.mockReturnValue({ eq: firstEqMock })

      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument()
      })
    })

    it('re-enables form after error', async () => {
      // Create error-returning chain
      const secondEqMock = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })
      const firstEqMock = jest.fn().mockReturnValue({ eq: secondEqMock })

      mockUpdate.mockReturnValue({ eq: firstEqMock })

      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled()
      })
    })

    it('clears error on retry', async () => {
      // First attempt fails
      const secondEqMockFail = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })
      const firstEqMockFail = jest.fn().mockReturnValue({ eq: secondEqMockFail })

      // Second attempt succeeds
      const secondEqMockSuccess = jest.fn().mockResolvedValue({ error: null })
      const firstEqMockSuccess = jest.fn().mockReturnValue({ eq: secondEqMockSuccess })

      mockUpdate
        .mockReturnValueOnce({ eq: firstEqMockFail })
        .mockReturnValueOnce({ eq: firstEqMockSuccess })

      render(<EditSlotPage />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
      })

      // First attempt
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(screen.getByText(/Database error/i)).toBeInTheDocument()
      })

      // Second attempt
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

      await waitFor(() => {
        expect(screen.queryByText(/Database error/i)).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 9: Navigation
  // ============================================================================

  describe('Navigation', () => {
    it('navigates back to slot detail on cancel', async () => {
      render(<EditSlotPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
        expect(mockPush).toHaveBeenCalledWith('/LMR/slots/123')
      })
    })

    it('navigates back to slots list when slot not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      render(<EditSlotPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Back to Slots/i }))
        expect(mockPush).toHaveBeenCalledWith('/LMR/slots')
      })
    })
  })
})
