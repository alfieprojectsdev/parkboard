'use client'

import { createContext, useContext, ReactNode } from 'react'

/**
 * Community Context Type
 * Provides community information throughout the app
 */
interface CommunityContextType {
  code: string          // 'LMR' - used in URLs
  name: string          // 'Lumiere' - short name
  displayName: string   // 'Lumiere Residences' - full name for UI
}

/**
 * Community Context
 * Initialized in app/[community]/layout.tsx
 */
const CommunityContext = createContext<CommunityContextType | null>(null)

/**
 * Community Provider Component
 * Wraps all routes under /[community]/*
 */
export function CommunityProvider({
  children,
  value
}: {
  children: ReactNode
  value: CommunityContextType
}) {
  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  )
}

/**
 * useCommunity Hook
 * Access community context in any component
 *
 * @example
 * const community = useCommunity()
 * console.log(community.code) // 'LMR'
 * console.log(community.displayName) // 'Lumiere Residences'
 */
export function useCommunity() {
  const context = useContext(CommunityContext)

  if (!context) {
    throw new Error(
      'useCommunity must be used within CommunityProvider. ' +
      'Make sure you are accessing this within a /[community]/* route.'
    )
  }

  return context
}
