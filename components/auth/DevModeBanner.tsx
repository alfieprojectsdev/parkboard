'use client'

import { isDevMode } from '@/lib/auth/dev-session'

/**
 * Dev Mode Warning Banner
 *
 * Shows prominent warning when in dev mode.
 * Helps prevent confusion if accidentally deployed.
 *
 * Banner text approved by: Root instance 2025-10-31
 */
export default function DevModeBanner() {
  if (!isDevMode()) {
    return null
  }

  return (
    <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium">
      🚧 <strong>DEV MODE</strong> - Test Authentication Active
    </div>
  )
}
