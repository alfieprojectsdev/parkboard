/**
 * TEST-R002: Login Page (COMPREHENSIVE)
 * Priority: P0 (Critical)
 * Source: tests_20251007-090752.md lines 106-184
 * Updated: 2025-10-09 - Full coverage implementation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/(auth)/login/page'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
const mockSignInWithPassword = jest.fn()
const mockSignInWithOAuth = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}))

describe('Login Page (TEST-R002 - COMPREHENSIVE)', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    // Reset all mocks completely
    mockPush.mockClear()
    mockSignInWithPassword.mockReset()
    mockSignInWithOAuth.mockReset()

    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })

    // Default mock implementations
    mockSignInWithPassword.mockResolvedValue({ data: { user: {} }, error: null })
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })

    // Mock window.location.href assignment
    // @ts-ignore - Mocking location.href for testing
    delete window.location
    // @ts-ignore
    window.location = { href: '' }
  })

  // ============================================================================
  // TEST GROUP 1: Form Rendering
  // ============================================================================

  describe('Form Rendering', () => {
    it('renders login form with all fields', () => {
      render(<LoginPage />)

      // Check for page title
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
      expect(screen.getByText('Sign in to ParkBoard')).toBeInTheDocument()

      // Check for email input
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()

      // Check for password input
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('••••••')).toBeInTheDocument()

      // Check for submit button
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    // OAuth buttons are commented out for MVP testing
    it.skip('renders OAuth buttons', () => {
      render(<LoginPage />)

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument()
    })

    it('renders sign up link', () => {
      render(<LoginPage />)

      const signUpLink = screen.getByRole('link', { name: /sign up/i })
      expect(signUpLink).toBeInTheDocument()
      expect(signUpLink).toHaveAttribute('href', '/register')
    })

    it('email input has correct attributes', () => {
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })

    it('password input has correct attributes', () => {
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })
  })

  // ============================================================================
  // TEST GROUP 2: Form Validation
  // ============================================================================

  describe('Form Validation', () => {
    it('prevents submission with empty fields', () => {
      render(<LoginPage />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      fireEvent.click(submitButton)

      // HTML5 validation should prevent submission
      // signInWithPassword should not be called
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it('updates email input value on change', () => {
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      expect(emailInput.value).toBe('test@example.com')
    })

    it('updates password input value on change', () => {
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: 'mypassword' } })

      expect(passwordInput.value).toBe('mypassword')
    })
  })

  // ============================================================================
  // TEST GROUP 3: Successful Login
  // ============================================================================

  describe('Successful Login', () => {
    it('handles successful email/password login', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      })

      render(<LoginPage />)

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      })

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      // Wait for async operations
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      // Should redirect to / (community selector) via window.location.href
      // This was changed from router.push() to prevent race conditions
      // Note: JSDOM expands relative URLs to full URLs (http://localhost/)
      expect(window.location.href).toBe('http://localhost/')
    })

    it('shows loading state during login', async () => {
      mockSignInWithPassword.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: { user: {} }, error: null }), 100)
        })
      })

      render(<LoginPage />)

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      })

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      })

      // Button should be disabled
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })

    it('disables form during submission', async () => {
      mockSignInWithPassword.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: { user: {} }, error: null }), 100)
        })
      })

      render(<LoginPage />)

      // Fill and submit
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      // All buttons should be disabled during loading
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach((button) => {
          expect(button).toBeDisabled()
        })
      })
    })
  })

  // ============================================================================
  // TEST GROUP 4: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('displays error message on invalid credentials', async () => {
      // Create isolated mocks for this test
      const testMockPush = jest.fn()
      ;(useRouter as jest.Mock).mockReturnValue({ push: testMockPush })

      mockSignInWithPassword.mockReset()
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      })

      render(<LoginPage />)

      // Fill in form with invalid credentials
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' },
      })

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      // Wait for error to display
      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })

      // Should NOT redirect
      expect(testMockPush).not.toHaveBeenCalled()
    })

    it('displays generic error message on network failure', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Network request failed' },
      })

      render(<LoginPage />)

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/network request failed/i)).toBeInTheDocument()
      })
    })

    it('clears error message on retry', async () => {
      // First attempt fails
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      })

      render(<LoginPage />)

      // First submission
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpass' },
      })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })

      // Second attempt succeeds
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'user-123' }, session: {} },
        error: null,
      })

      // Retry with correct password
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'correctpass' },
      })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument()
      })
    })

    it('re-enables button after error', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      })

      render(<LoginPage />)

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpass' },
      })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      // Wait for error and button to re-enable
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled()
      })
    })
  })

  // ============================================================================
  // TEST GROUP 5: OAuth Login (SKIPPED FOR MVP - OAuth commented out)
  // ============================================================================

  describe.skip('OAuth Login', () => {
    it('handles Google OAuth login', async () => {
      render(<LoginPage />)

      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: expect.stringContaining('/auth/callback'),
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        })
      })
    })

    it('handles Facebook OAuth login', async () => {
      render(<LoginPage />)

      const facebookButton = screen.getByRole('button', { name: /continue with facebook/i })
      fireEvent.click(facebookButton)

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'facebook',
          options: {
            redirectTo: expect.stringContaining('/auth/callback'),
          },
        })
      })
    })

    it('displays error on OAuth failure', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'OAuth provider error' },
      })

      render(<LoginPage />)

      fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

      await waitFor(() => {
        expect(screen.getByText(/oauth provider error/i)).toBeInTheDocument()
      })
    })

    it('disables all buttons during OAuth login', async () => {
      mockSignInWithOAuth.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: {}, error: null }), 100)
        })
      })

      render(<LoginPage />)

      fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach((button) => {
          expect(button).toBeDisabled()
        })
      })
    })
  })

  // ============================================================================
  // TEST GROUP 6: Integration
  // ============================================================================

  describe('Integration', () => {
    it('submits form on Enter key press', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: {} },
        error: null,
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // Press Enter on password field
      fireEvent.submit(passwordInput.closest('form')!)

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalled()
      })
    })

    it('does not navigate if login fails', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      })

      render(<LoginPage />)

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpass' },
      })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
