/**
 * TEST-R005: Slot Detail & Booking Page (COMPREHENSIVE)
 * Priority: P0 (Critical)
 * Source: tests_20251007-090752.md lines 354-473
 * Updated: 2025-10-09 - Full coverage implementation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useParams, useRouter } from 'next/navigation'
import BookSlotPage from '@/app/LMR/slots/[slotId]/page'

// CommunityContext mock removed (no longer needed in minimal MVP)

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, ...props }: any) => (
    <div role="alert" data-variant={variant} {...props}>{children}</div>
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

// Mock Navigation component
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
  useParams: jest.fn(),
  useRouter: jest.fn(),
}))

// Mock Supabase client
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockInsert = jest.fn()
const mockOr = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

describe('Slot Detail & Booking Page (TEST-R005 - COMPREHENSIVE)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Setup router mocks
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useParams as jest.Mock).mockReturnValue({ slotId: '1' })

    // Setup auth mock
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      profile: null,
      loading: false,
    })

    // Setup default Supabase query chains
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockOr.mockResolvedValue({ data: [], error: null })
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ or: mockOr }) }) }),
          insert: mockInsert,
        }
      }
      return { select: mockSelect }
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ============================================================================
  // TEST GROUP 1: Page Structure
  // ============================================================================

  describe('Page Structure', () => {
    it('renders navigation component', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        expect(screen.getByTestId('navigation')).toBeInTheDocument()
      })
    })

    // SKIP: AuthWrapper is layout's responsibility, not page component's
    // Page components are wrapped in AuthWrapper by app/[community]/layout.tsx
    // Mocking the entire layout hierarchy in unit tests is complex and fragile
    // E2E tests verify the full auth flow including layout wrapping
    it.skip('wraps content in AuthWrapper', () => {
      render(<BookSlotPage />)

      expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // TEST GROUP 2: Slot Detail Display
  // ============================================================================

  describe('Slot Detail Display', () => {
    it('displays slot details after loading', async () => {
      const mockSlot = {
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
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        expect(screen.getByText('Slot A-10')).toBeInTheDocument()
        expect(screen.getByText('₱50/hr')).toBeInTheDocument()
        expect(screen.getByText('covered')).toBeInTheDocument()
        expect(screen.getByText('Near elevator')).toBeInTheDocument()
        expect(screen.getByText(/Owner: John Doe/i)).toBeInTheDocument()
      })
    })

    it('displays slot without description gracefully', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'B-05',
        slot_type: 'uncovered',
        description: null,
        price_per_hour: 30,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        expect(screen.getByText('Slot B-05')).toBeInTheDocument()
        expect(screen.getByText('₱30/hr')).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 3: Loading State
  // ============================================================================

  describe('Loading State', () => {
    it('displays loading spinner initially', () => {
      mockSingle.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: null, error: null }), 100)
        })
      })

      render(<BookSlotPage />)

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('hides loading spinner after slot loads', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin')
        expect(spinner).not.toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 4: Booking Form
  // ============================================================================

  describe('Booking Form', () => {
    it('renders booking form fields', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        expect(screen.getByLabelText(/start time/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/end time/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
    })

    it('updates start time on input change', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        const startTimeInput = screen.getByLabelText(/start time/i) as HTMLInputElement
        fireEvent.change(startTimeInput, { target: { value: '2025-10-10T10:00' } })
        expect(startTimeInput.value).toBe('2025-10-10T10:00')
      })
    })

    it('updates end time on input change', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        const endTimeInput = screen.getByLabelText(/end time/i) as HTMLInputElement
        fireEvent.change(endTimeInput, { target: { value: '2025-10-10T12:00' } })
        expect(endTimeInput.value).toBe('2025-10-10T12:00')
      })
    })
  })

  // ============================================================================
  // TEST GROUP 5: Price Calculation
  // ============================================================================

  describe('Price Calculation', () => {
    it('calculates and displays total price', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2025-10-10T10:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2025-10-10T12:00' },
        })
      })

      await waitFor(() => {
        // 2 hours * ₱50/hr = ₱100
        expect(screen.getByText(/₱100\.00/)).toBeInTheDocument()
      })
    })

    it('does not show price when times are invalid', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2025-10-10T12:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2025-10-10T10:00' },
        })
      })

      await waitFor(() => {
        expect(screen.queryByText(/Estimated Total/i)).not.toBeInTheDocument()
      })
    })

    it('shows server calculation disclaimer', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2025-10-10T10:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2025-10-10T12:00' },
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/Final price will be calculated by the server/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 6: Booking Submission
  // ============================================================================

  describe('Booking Submission', () => {
    it('submits booking with correct data', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })
      mockOr.mockResolvedValue({ data: [], error: null })
      mockInsert.mockResolvedValue({ error: null })

      render(<BookSlotPage />)

      // Use future dates (2026)
      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2026-10-10T10:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2026-10-10T12:00' },
        })
      })

      fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          slot_id: 1,
          renter_id: 'user-123',
          start_time: '2026-10-10T10:00',
          end_time: '2026-10-10T12:00',
          status: 'pending',
        })
      })
    })

    it('shows success message after booking', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })
      mockOr.mockResolvedValue({ data: [], error: null })
      mockInsert.mockResolvedValue({ error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2026-10-10T10:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2026-10-10T12:00' },
        })
      })

      fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))

      await waitFor(() => {
        expect(screen.getByText(/Booking created successfully/i)).toBeInTheDocument()
      })
    })

    it('redirects to bookings page after success', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })
      mockOr.mockResolvedValue({ data: [], error: null })
      mockInsert.mockResolvedValue({ error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2026-10-10T10:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2026-10-10T12:00' },
        })
      })

      fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))

      await waitFor(() => {
        expect(screen.getByText(/Booking created successfully/i)).toBeInTheDocument()
      })

      // Fast-forward timer
      jest.advanceTimersByTime(2000)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/LMR/bookings')
      })
    })

    it('shows loading state during submission', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })
      mockOr.mockResolvedValue({ data: [], error: null })
      mockInsert.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ error: null }), 100)
        })
      })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2026-10-10T10:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2026-10-10T12:00' },
        })
      })

      fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))

      await waitFor(() => {
        expect(screen.getByText(/Booking\.\.\./i)).toBeInTheDocument()
      })
    })

    it('disables form during submission', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })
      mockOr.mockResolvedValue({ data: [], error: null })
      mockInsert.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ error: null }), 100)
        })
      })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2026-10-10T10:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2026-10-10T12:00' },
        })
      })

      fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Booking\.\.\./i })).toBeDisabled()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 7: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('displays error when slot fetch fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Slot not found' },
      })

      render(<BookSlotPage />)

      await waitFor(() => {
        expect(screen.getByText(/Error loading slot:/i)).toBeInTheDocument()
        expect(screen.getByText(/Slot not found/i)).toBeInTheDocument()
      })
    })

    it('disables submit button when end time is before start time', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2025-10-10T12:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2025-10-10T10:00' },
        })
      })

      await waitFor(() => {
        // Button should be disabled when price is 0 (invalid times)
        expect(screen.getByRole('button', { name: /confirm booking/i })).toBeDisabled()
      })
    })

    it('shows error when slot has time conflict', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })
      mockOr.mockResolvedValue({ data: [{ booking_id: 1 }], error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.change(screen.getByLabelText(/start time/i), {
          target: { value: '2026-10-10T10:00' },
        })
        fireEvent.change(screen.getByLabelText(/end time/i), {
          target: { value: '2026-10-10T12:00' },
        })
      })

      fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))

      await waitFor(() => {
        expect(screen.getByText(/Slot already booked for this time/i)).toBeInTheDocument()
      })
    })

    it('shows error when slot is not active', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'inactive',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        expect(screen.getByText(/This slot is not available for booking/i)).toBeInTheDocument()
      })
    })

    it('shows "Back to Slots" button on error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Slot not found' },
      })

      render(<BookSlotPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to slots/i })).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 8: Navigation
  // ============================================================================

  describe('Navigation', () => {
    it('navigates back to slots on cancel', async () => {
      const mockSlot = {
        slot_id: 1,
        slot_number: 'A-10',
        slot_type: 'covered',
        description: null,
        price_per_hour: 50,
        status: 'active',
        user_profiles: null,
      }

      mockSingle.mockResolvedValue({ data: mockSlot, error: null })

      render(<BookSlotPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      })

      expect(mockPush).toHaveBeenCalledWith('/LMR/slots')
    })
  })
})
