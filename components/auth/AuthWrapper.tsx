// ============================================================================
// AUTH WRAPPER COMPONENT - NextAuth.js v5
// ============================================================================
// This component provides authentication state to the entire app
// Uses React Context API to share auth data globally
// Uses NextAuth.js useSession() hook for authentication state
// ============================================================================
'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/types/database'

// ============================================================================
// SECTION 1: Context Setup (Global State Management)
// ============================================================================

// User type that matches NextAuth session.user structure
interface AuthUser {
  id: string
  email: string
  name: string
  phone: string | null
  unitNumber: string | null
}

interface AuthContextType {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Custom hook to access auth context (requires AuthWrapper)
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthWrapper')
  }

  return context
}

// Optional version for public pages
// Returns null if not in AuthWrapper context (for public pages like browse slots)
export function useOptionalAuth(): AuthContextType | null {
  const context = useContext(AuthContext)
  return context || null
}

// ============================================================================
// SECTION 2: AuthWrapper Component
// ============================================================================

interface AuthWrapperProps {
  children: ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter()
  const { data: session, status } = useSession()

  // Derive loading state from NextAuth status
  const loading = status === 'loading'

  // Derive user from session
  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        phone: session.user.phone ?? null,
        unitNumber: session.user.unitNumber ?? null,
      }
    : null

  // Create profile object from session data for backward compatibility
  // This maps NextAuth session.user to UserProfile interface
  const profile: UserProfile | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        phone: session.user.phone ?? '',
        unit_number: session.user.unitNumber ?? '',
        created_at: '', // Not available from session
        updated_at: '', // Not available from session
      }
    : null

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // ============================================================================
  // SECTION 3: Render Logic (Conditional Rendering)
  // ============================================================================

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // No user - redirect to login (handled by useEffect above)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    )
  }

  // User exists but no profile (edge case with session data)
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // All good - render children with context
  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      <div data-testid="auth-wrapper">
        {children}
      </div>
    </AuthContext.Provider>
  )
}
