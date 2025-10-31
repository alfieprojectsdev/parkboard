'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  TEST_USERS,
  setDevSession,
  getDevSession,
  clearDevSession,
  isDevMode
} from '@/lib/auth/dev-session'

/**
 * Dev-Mode User Selector
 *
 * Shows dropdown to select test user for local testing.
 * Only renders when DEV_MODE_AUTH=true AND NODE_ENV=development
 *
 * Approved by: Root instance 2025-10-31 (shared-alerts.md)
 */
export default function DevUserSelector() {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [currentSession, setCurrentSession] = useState<{ user_id: string; user_name: string } | null>(null)

  useEffect(() => {
    if (isDevMode()) {
      setCurrentSession(getDevSession())
    }
  }, [])

  // Don't render in production or when dev mode disabled
  if (!isDevMode()) {
    return null
  }

  function handleLogin() {
    if (!selectedUserId) return

    setDevSession(selectedUserId)
    setCurrentSession(getDevSession())
    router.refresh() // Refresh to update server-side state
  }

  function handleLogout() {
    clearDevSession()
    setCurrentSession(null)
    router.refresh()
  }

  return (
    <Card className="border-2 border-yellow-400 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🚧</span>
          Dev Mode: Test User Selector
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentSession ? (
          <div className="space-y-3">
            <Alert className="bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Logged in as:</strong> {currentSession.user_name}
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                >
                  Logout
                </Button>
              </div>
            </Alert>
            <p className="text-sm text-gray-600">
              You can now post slots, browse listings, and test all features as this user.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">
              Select a test user to simulate authentication. This only works in development mode.
            </p>

            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">-- Select Test User --</option>
              {TEST_USERS.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.unit_number}) - {user.email}
                </option>
              ))}
            </select>

            <Button
              onClick={handleLogin}
              disabled={!selectedUserId}
              className="w-full"
            >
              Login as Selected User
            </Button>

            <Alert className="bg-blue-50 border-blue-200">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> Test users are created by <code>scripts/seed-test-data-bypass-rls.sql</code>
              </p>
            </Alert>
          </div>
        )}

        <Alert className="mt-4 bg-red-50 border-red-200">
          <p className="text-xs text-red-800">
            ⚠️ <strong>Production Safety:</strong> This component automatically hides when <code>DEV_MODE_AUTH=false</code> or in production builds.
          </p>
        </Alert>
      </CardContent>
    </Card>
  )
}
