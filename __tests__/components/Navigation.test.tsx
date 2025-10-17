/**
 * TEST-C001: Navigation Component
 * Priority: P0 (Critical)
 * Source: tests_20251007-090752.md lines 1368-1415
 */

import { render, screen } from '@testing-library/react'
import Navigation from '@/components/common/Navigation'

// Mock CommunityContext (required for multi-tenant navigation)
jest.mock('@/lib/context/CommunityContext', () => ({
  useCommunity: () => ({
    code: 'LMR',
    name: 'Lumiere',
    displayName: 'Lumiere Residences',
  }),
}))

// Mock AuthWrapper context
jest.mock('@/components/auth/AuthWrapper', () => ({
  useOptionalAuth: () => ({
    profile: { name: 'John Doe', unit_number: '10A' },
    user: { id: 'test-user-id' },
  }),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  })),
}))

describe('Navigation Component (TEST-C001)', () => {
  it('displays user name and unit', () => {
    render(<Navigation />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText(/unit 10a/i)).toBeInTheDocument()
  })

  it('renders navigation links with community context', () => {
    render(<Navigation />)

    const browseLink = screen.getByRole('link', { name: /browse slots/i })
    const listLink = screen.getByRole('link', { name: /list my slot/i })
    const bookingsLink = screen.getByRole('link', { name: /my bookings/i })

    expect(browseLink).toHaveAttribute('href', '/LMR/slots')
    expect(listLink).toHaveAttribute('href', '/LMR/slots/new')
    expect(bookingsLink).toHaveAttribute('href', '/LMR/bookings')
  })

  it('renders sign out button', () => {
    render(<Navigation />)
    expect(screen.getByText(/sign out/i)).toBeInTheDocument()
  })

  it('sign out button is clickable', () => {
    render(<Navigation />)
    const signOutButton = screen.getByRole('button', { name: /sign out/i })

    // Verify button is not disabled
    expect(signOutButton).not.toBeDisabled()

    // Verify button has onClick handler (component should not crash when clicked)
    expect(() => signOutButton.click()).not.toThrow()
  })
})
