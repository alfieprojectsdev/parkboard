/**
 * TEST-R007: New Slot Listing Page (COMPREHENSIVE)
 * Priority: P0 (Critical)
 * Source: tests_20251007-090752.md lines 572-651
 * Updated: 2025-10-09 - Full coverage implementation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import NewSlotPage from '@/app/LMR/slots/new/page'

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
}))

// Mock Supabase
const mockFrom = jest.fn()
const mockInsert = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

describe('New Slot Listing Page (TEST-R007 - COMPREHENSIVE)', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })

    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      profile: null,
      loading: false,
    })

    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })
  })

  // ============================================================================
  // TEST GROUP 1: Form Rendering
  // ============================================================================

  describe('Form Rendering', () => {
    it('renders form with all fields', () => {
      render(<NewSlotPage />)

      expect(screen.getByLabelText(/slot number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/slot type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/price per hour/i)).toBeInTheDocument()
    })

    it('renders required field indicators', () => {
      render(<NewSlotPage />)

      const requiredFields = screen.getAllByText('*')
      expect(requiredFields.length).toBeGreaterThanOrEqual(3) // slot_number, slot_type, price_per_hour
    })

    it('renders action buttons', () => {
      render(<NewSlotPage />)

      expect(screen.getByRole('button', { name: /list slot/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders helper text', () => {
      render(<NewSlotPage />)

      expect(screen.getByText(/This should match the number painted/i)).toBeInTheDocument()
      expect(screen.getByText(/Suggested: ₱30-100\/hour/i)).toBeInTheDocument()
    })

    it('has covered as default slot type', () => {
      render(<NewSlotPage />)

      const slotTypeSelect = screen.getByLabelText(/slot type/i) as HTMLSelectElement
      expect(slotTypeSelect.value).toBe('covered')
    })
  })

  // ============================================================================
  // TEST GROUP 2: Form Input
  // ============================================================================

  describe('Form Input', () => {
    it('updates slot number on change', () => {
      render(<NewSlotPage />)

      const input = screen.getByLabelText(/slot number/i) as HTMLInputElement
      fireEvent.change(input, { target: { value: 'A-10' } })

      expect(input.value).toBe('A-10')
    })

    it('updates slot type on change', () => {
      render(<NewSlotPage />)

      const select = screen.getByLabelText(/slot type/i) as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'uncovered' } })

      expect(select.value).toBe('uncovered')
    })

    it('updates description on change', () => {
      render(<NewSlotPage />)

      const textarea = screen.getByLabelText(/description/i) as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: 'Near elevator' } })

      expect(textarea.value).toBe('Near elevator')
    })

    it('updates price on change', () => {
      render(<NewSlotPage />)

      const input = screen.getByLabelText(/price per hour/i) as HTMLInputElement
      fireEvent.change(input, { target: { value: '50' } })

      expect(input.value).toBe('50')
    })
  })

  // ============================================================================
  // TEST GROUP 3: Form Validation
  // ============================================================================

  describe('Form Validation', () => {
    it('requires slot number', () => {
      render(<NewSlotPage />)

      const slotNumberInput = screen.getByLabelText(/slot number/i) as HTMLInputElement
      expect(slotNumberInput).toHaveAttribute('required')
    })

    it('requires price per hour', () => {
      render(<NewSlotPage />)

      const priceInput = screen.getByLabelText(/price per hour/i) as HTMLInputElement
      expect(priceInput).toHaveAttribute('required')
      expect(priceInput).toHaveAttribute('min', '1')
    })

    it('enforces minimum price with HTML5 validation', () => {
      render(<NewSlotPage />)

      const priceInput = screen.getByLabelText(/price per hour/i) as HTMLInputElement

      // HTML5 min attribute should prevent negative values
      expect(priceInput).toHaveAttribute('min', '1')
      expect(priceInput).toHaveAttribute('type', 'number')
    })

    it('shows error for empty slot number', async () => {
      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: '   ' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(screen.getByText(/Slot number is required/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 4: Successful Submission
  // ============================================================================

  describe('Successful Submission', () => {
    it('submits form with correct data', async () => {
      mockInsert.mockResolvedValue({ error: null })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'a-10' },
      })
      fireEvent.change(screen.getByLabelText(/slot type/i), {
        target: { value: 'covered' },
      })
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Near elevator' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50.00' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          owner_id: 'user-123',
          // community_code removed (column no longer exists in minimal MVP)
          slot_number: 'A-10', // Should be uppercased
          slot_type: 'covered',
          description: 'Near elevator',
          price_per_hour: 50,
          status: 'active',
        })
      })
    })

    it('converts slot number to uppercase', async () => {
      mockInsert.mockResolvedValue({ error: null })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'b-05' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '30' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            slot_number: 'B-05',
          })
        )
      })
    })

    it('trims whitespace from inputs', async () => {
      mockInsert.mockResolvedValue({ error: null })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: '  A-10  ' },
      })
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: '  Near elevator  ' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            slot_number: 'A-10',
            description: 'Near elevator',
          })
        )
      })
    })

    it('sets description to null when empty', async () => {
      mockInsert.mockResolvedValue({ error: null })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'A-10' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            description: null,
          })
        )
      })
    })

    it('redirects to slots page after success', async () => {
      mockInsert.mockResolvedValue({ error: null })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'A-10' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/LMR/slots')
      })
    })

    it('shows loading state during submission', async () => {
      mockInsert.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ error: null }), 100)
        })
      })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'A-10' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(screen.getByText(/Creating Listing\.\.\./i)).toBeInTheDocument()
      })
    })

    it('disables buttons during submission', async () => {
      mockInsert.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ error: null }), 100)
        })
      })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'A-10' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Creating Listing\.\.\./i })).toBeDisabled()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 5: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('displays error for duplicate slot number', async () => {
      mockInsert.mockResolvedValue({
        error: { code: '23505', message: 'Unique constraint violation' },
      })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'A-10' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/This slot number already exists/i)
        ).toBeInTheDocument()
      })
    })

    it('displays generic error on database failure', async () => {
      mockInsert.mockResolvedValue({
        error: { message: 'Database connection failed' },
      })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'A-10' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument()
      })
    })

    it('re-enables form after error', async () => {
      mockInsert.mockResolvedValue({
        error: { message: 'Database error' },
      })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'A-10' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /list slot/i })).not.toBeDisabled()
      })
    })

    it('clears error on retry', async () => {
      // First attempt fails
      mockInsert.mockResolvedValueOnce({
        error: { message: 'Database error' },
      })

      render(<NewSlotPage />)

      fireEvent.change(screen.getByLabelText(/slot number/i), {
        target: { value: 'A-10' },
      })
      fireEvent.change(screen.getByLabelText(/price per hour/i), {
        target: { value: '50' },
      })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(screen.getByText(/Database error/i)).toBeInTheDocument()
      })

      // Second attempt succeeds
      mockInsert.mockResolvedValueOnce({ error: null })

      fireEvent.click(screen.getByRole('button', { name: /list slot/i }))

      await waitFor(() => {
        expect(screen.queryByText(/Database error/i)).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 6: Navigation
  // ============================================================================

  describe('Navigation', () => {
    it('navigates back to slots on cancel', () => {
      render(<NewSlotPage />)

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockPush).toHaveBeenCalledWith('/LMR/slots')
    })
  })
})
