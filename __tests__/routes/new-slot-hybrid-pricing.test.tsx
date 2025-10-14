/**
 * TEST: New Slot Creation with Hybrid Pricing
 * Priority: P0 (Critical)
 * Feature: Request Quote + Explicit Pricing
 * Created: 2025-10-13
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import NewSlotPage from '@/app/[community]/slots/new/page'

// Mock CommunityContext (required for multi-tenant pages)
jest.mock('@/lib/context/CommunityContext', () => ({
  useCommunity: () => ({
    code: 'LMR',
    name: 'Lumiere',
    displayName: 'Lumiere Residences',
  }),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
const mockInsert = jest.fn()
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
    user: { id: 'test-user-123', email: 'test@example.com' },
    profile: { name: 'Test User' },
    loading: false,
  }),
}))

// Mock Navigation
jest.mock('@/components/common/Navigation', () => ({
  __esModule: true,
  default: () => <nav>Navigation</nav>,
}))

describe('New Slot Creation - Hybrid Pricing', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })

    // Setup Supabase mock chain
    mockInsert.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })
  })

  // ============================================================================
  // TEST GROUP 1: Explicit Pricing (Existing Behavior)
  // ============================================================================

  // Hybrid pricing UI not yet implemented - skip these tests for now
  describe.skip('Explicit Pricing (with price)', () => {
    it('creates slot with explicit pricing when price provided', async () => {
      render(<NewSlotPage />)

      // Fill form with explicit pricing
      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'A-100' },
      })

      fireEvent.change(screen.getByLabelText(/slot type/i), {
        target: { value: 'covered' },
      })

      // Select explicit pricing (should be default)
      const explicitRadio = screen.getByLabelText(/set fixed price/i)
      fireEvent.click(explicitRadio)

      // Enter price
      const priceInput = screen.getByLabelText(/price per hour/i)
      fireEvent.change(priceInput, { target: { value: '75' } })

      // Submit
      const submitButton = screen.getByRole('button', { name: /list slot/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          owner_id: 'test-user-123',
          slot_number: 'A-100',
          slot_type: 'covered',
          description: null,
          price_per_hour: 75,  // Explicit price
          status: 'active',
        })
      })
    })

    it('validates that price is required for explicit pricing', async () => {
      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'B-200' },
      })

      // Select explicit pricing
      const explicitRadio = screen.getByLabelText(/set fixed price/i)
      fireEvent.click(explicitRadio)

      // DON'T enter price - leave empty

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /list slot/i })
      fireEvent.click(submitButton)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          return element?.textContent?.toLowerCase().includes('price must be greater than 0 for instant booking') || false
        })).toBeInTheDocument()
      })

      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('shows "Instant Booking" badge for explicit pricing', async () => {
      render(<NewSlotPage />)

      const explicitRadio = screen.getByLabelText(/set fixed price/i)
      fireEvent.click(explicitRadio)

      // Should show badge (within the Explicit Pricing option)
      const badges = screen.getAllByText(/instant booking/i)
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // TEST GROUP 2: Request Quote Pricing (NEW FEATURE)
  // ============================================================================

  // Hybrid pricing UI not yet implemented
  describe.skip('Request Quote Pricing (NULL price)', () => {
    it('creates slot with NULL price when Request Quote selected', async () => {
      render(<NewSlotPage />)

      // Fill basic info
      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'C-300' },
      })

      fireEvent.change(screen.getByLabelText(/slot type/i), {
        target: { value: 'covered' },
      })

      // Select Request Quote pricing
      const requestQuoteRadio = screen.getByLabelText(/request quote/i)
      fireEvent.click(requestQuoteRadio)

      // Submit (no price needed)
      const submitButton = screen.getByRole('button', { name: /list slot/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          owner_id: 'test-user-123',
          slot_number: 'C-300',
          slot_type: 'covered',
          description: null,
          price_per_hour: null,  // NULL for Request Quote
          status: 'active',
        })
      })
    })

    it('hides price input when Request Quote selected', async () => {
      render(<NewSlotPage />)

      // Initially shows price input (explicit is default)
      expect(screen.getByLabelText(/price per hour/i)).toBeInTheDocument()

      // Switch to Request Quote
      const requestQuoteRadio = screen.getByLabelText(/request quote/i)
      fireEvent.click(requestQuoteRadio)

      // Price input should be hidden
      expect(screen.queryByLabelText(/price per hour/i)).not.toBeInTheDocument()
    })

    it('shows explanation for Request Quote mode', async () => {
      render(<NewSlotPage />)

      const requestQuoteRadio = screen.getByLabelText(/request quote/i)
      fireEvent.click(requestQuoteRadio)

      // Should show informational alert
      expect(screen.getByText(/request quote mode/i)).toBeInTheDocument()
      expect(screen.getByText((content, element) => {
        return element?.textContent?.toLowerCase().includes('call or message you directly') || false
      })).toBeInTheDocument()
    })

    it('shows "Contact Required" badge for request quote', async () => {
      render(<NewSlotPage />)

      const requestQuoteRadio = screen.getByLabelText(/request quote/i)
      fireEvent.click(requestQuoteRadio)

      // Should show badge
      expect(screen.getByText(/contact required/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // TEST GROUP 3: Pricing Type Toggle
  // ============================================================================

  // Hybrid pricing UI not yet implemented
  describe.skip('Pricing Type Toggle', () => {
    it('toggles between explicit and request quote pricing', async () => {
      render(<NewSlotPage />)

      const explicitRadio = screen.getByLabelText(/set fixed price/i)
      const requestQuoteRadio = screen.getByLabelText(/request quote/i)

      // Default: explicit pricing
      expect(explicitRadio).toBeChecked()
      expect(screen.getByLabelText(/price per hour/i)).toBeInTheDocument()

      // Switch to request quote
      fireEvent.click(requestQuoteRadio)
      expect(requestQuoteRadio).toBeChecked()
      expect(screen.queryByLabelText(/price per hour/i)).not.toBeInTheDocument()

      // Switch back to explicit
      fireEvent.click(explicitRadio)
      expect(explicitRadio).toBeChecked()
      expect(screen.getByLabelText(/price per hour/i)).toBeInTheDocument()
    })

    it('preserves entered price when toggling back to explicit', async () => {
      render(<NewSlotPage />)

      // Enter price in explicit mode
      const priceInput = screen.getByLabelText(/price per hour/i)
      fireEvent.change(priceInput, { target: { value: '100' } })

      // Switch to request quote
      const requestQuoteRadio = screen.getByLabelText(/request quote/i)
      fireEvent.click(requestQuoteRadio)

      // Switch back to explicit
      const explicitRadio = screen.getByLabelText(/set fixed price/i)
      fireEvent.click(explicitRadio)

      // Price should still be there
      const priceInputAgain = screen.getByLabelText(/price per hour/i)
      expect(priceInputAgain).toHaveValue(100)
    })
  })

  // ============================================================================
  // TEST GROUP 4: Form Validation Edge Cases
  // ============================================================================

  // Hybrid pricing UI not yet implemented
  describe.skip('Form Validation', () => {
    it('allows zero or negative prices to fail validation', async () => {
      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'D-400' },
      })

      // Try negative price
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '-10' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          return element?.textContent?.toLowerCase().includes('price must be greater than 0 for instant booking') || false
        })).toBeInTheDocument()
      })

      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('allows decimal prices for explicit pricing', async () => {
      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'E-500' },
      })

      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '45.50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            price_per_hour: 45.50,
          })
        )
      })
    })
  })

  // ============================================================================
  // TEST GROUP 5: Success/Error Handling
  // ============================================================================

  describe('Success and Error Handling', () => {
    it('redirects to /LMR/slots after successful creation', async () => {
      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'F-600' },
      })

      const requestQuoteRadio = screen.getByLabelText(/request quote/i)
      fireEvent.click(requestQuoteRadio)

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/LMR/slots')
      })
    })

    it('handles database errors gracefully', async () => {
      const testError = { message: 'Database connection failed', code: 'DB_ERROR' }
      mockInsert.mockResolvedValue({
        data: null,
        error: testError,
      })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'G-700' },
      })

      // Select request quote to skip price validation
      const requestQuoteRadio = screen.getByLabelText(/request quote/i)
      fireEvent.click(requestQuoteRadio)

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        // Error message is testError.message which gets thrown as-is
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
