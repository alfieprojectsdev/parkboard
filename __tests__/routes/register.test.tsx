/**
 * TEST-R003: Register Page (COMPREHENSIVE)
 * Priority: P0 (Critical)
 * Source: tests_20251007-090752.md lines 187-255
 * Updated: 2025-10-09 - Full coverage implementation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import RegisterPage from '@/app/(auth)/register/page'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
const mockSignInWithPassword = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}))

// Mock global fetch
global.fetch = jest.fn()
global.alert = jest.fn()

describe('Register Page (TEST-R003 - COMPREHENSIVE)', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })

    // Default mock implementations
    mockSignInWithPassword.mockResolvedValue({ data: { user: {} }, error: null })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  // ============================================================================
  // TEST GROUP 1: Form Rendering
  // ============================================================================

  describe('Form Rendering', () => {
    it('renders registration form with all fields', () => {
      render(<RegisterPage />)

      // Check for page title
      expect(screen.getByText('Create Account')).toBeInTheDocument()
      expect(screen.getByText('Join ParkBoard marketplace')).toBeInTheDocument()

      // Check for all input fields
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/unit number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()

      // Check for submit button
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
    })

    it('renders sign in link', () => {
      render(<RegisterPage />)

      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toBeInTheDocument()
      expect(signInLink).toHaveAttribute('href', '/login')
    })

    it('renders phone format helper text', () => {
      render(<RegisterPage />)

      expect(screen.getByText(/format: \+63 followed by 10 digits/i)).toBeInTheDocument()
    })

    it('all inputs have required attribute', () => {
      render(<RegisterPage />)

      const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement
      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement
      const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement
      const unitInput = screen.getByLabelText(/unit number/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement

      expect(nameInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('required')
      expect(phoneInput).toHaveAttribute('required')
      expect(unitInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
      expect(confirmPasswordInput).toHaveAttribute('required')
    })

    it('password fields have minLength attribute', () => {
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement

      expect(passwordInput).toHaveAttribute('minlength', '6')
      expect(confirmPasswordInput).toHaveAttribute('minlength', '6')
    })
  })

  // ============================================================================
  // TEST GROUP 2: Form Validation
  // ============================================================================

  describe('Form Validation', () => {
    it('prevents submission with empty fields', () => {
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /sign up/i })
      fireEvent.click(submitButton)

      // HTML5 validation should prevent submission
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('updates form fields on change', () => {
      render(<RegisterPage />)

      const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement
      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement
      const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement
      const unitInput = screen.getByLabelText(/unit number/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement

      fireEvent.change(nameInput, { target: { value: 'Juan Dela Cruz' } })
      fireEvent.change(emailInput, { target: { value: 'juan@example.com' } })
      fireEvent.change(phoneInput, { target: { value: '+639171234567' } })
      fireEvent.change(unitInput, { target: { value: '10A' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })

      expect(nameInput.value).toBe('Juan Dela Cruz')
      expect(emailInput.value).toBe('juan@example.com')
      expect(phoneInput.value).toBe('+639171234567')
      expect(unitInput.value).toBe('10A')
      expect(passwordInput.value).toBe('password123')
      expect(confirmPasswordInput.value).toBe('password123')
    })

    it('shows error when passwords do not match', async () => {
      render(<RegisterPage />)

      // Fill in form with mismatched passwords
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'juan@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password456' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })

      // Should not call API
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // TEST GROUP 3: Successful Registration
  // ============================================================================

  describe('Successful Registration', () => {
    it('handles successful registration and auto-login', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: {} },
        error: null,
      })

      render(<RegisterPage />)

      // Fill in form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'juan@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'juan@example.com',
            password: 'password123',
            name: 'Juan Dela Cruz',
            phone: '+639171234567',
            unit_number: '10A',
          }),
        })
      })

      // Should auto-login
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'juan@example.com',
          password: 'password123',
        })
      })

      // Should redirect to / (community selector)
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('shows loading state during registration', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              }),
            100
          )
        })
      })

      render(<RegisterPage />)

      // Fill in form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'juan@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText(/creating account/i)).toBeInTheDocument()
      })

      // Button should be disabled
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
    })

    it('redirects to login if auto-login fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auto-login failed' },
      })

      render(<RegisterPage />)

      // Fill in form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'juan@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Account created successfully! Please sign in.')
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  // ============================================================================
  // TEST GROUP 4: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('displays error when email already exists', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Email already exists' }),
      })

      render(<RegisterPage />)

      // Fill in form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'existing@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
      })

      // Should not redirect
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('displays error when unit number already exists', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Unit number already registered' }),
      })

      render(<RegisterPage />)

      // Fill in form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'juan@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText(/unit number already registered/i)).toBeInTheDocument()
      })
    })

    it('displays generic error on API failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: null }),
      })

      render(<RegisterPage />)

      // Fill in form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'juan@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
      })
    })

    it('clears error on retry', async () => {
      // First attempt fails
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email already exists' }),
      })

      render(<RegisterPage />)

      // First submission
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'existing@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
      })

      // Second attempt succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      // Change email and retry
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'newemail@example.com' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/email already exists/i)).not.toBeInTheDocument()
      })
    })

    it('re-enables button after error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Registration failed' }),
      })

      render(<RegisterPage />)

      // Fill in form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'juan@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

      // Wait for error and button to re-enable
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign up/i })).not.toBeDisabled()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 5: Integration
  // ============================================================================

  describe('Integration', () => {
    it('submits form on Enter key press', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterPage />)

      const form = screen.getByRole('button', { name: /sign up/i }).closest('form')!

      // Fill in form
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Juan Dela Cruz' },
      })
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'juan@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+639171234567' },
      })
      fireEvent.change(screen.getByLabelText(/unit number/i), {
        target: { value: '10A' },
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password123' },
      })

      // Submit via Enter key
      fireEvent.submit(form)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })
})
