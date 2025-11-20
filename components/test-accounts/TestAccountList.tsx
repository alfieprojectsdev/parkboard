'use client'

import { useEffect, useState } from 'react'
import TestAccountCard from './TestAccountCard'

interface TestAccount {
  id: string
  name: string
  unit_number: string
  email: string
  is_available: boolean
  test_account_taken_at: string | null
  test_account_released_at: string | null
}

export default function TestAccountList() {
  const [accounts, setAccounts] = useState<TestAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Fetch all test accounts
  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/test-accounts')

      if (!response.ok) {
        throw new Error(`Failed to fetch test accounts: ${response.statusText}`)
      }

      const data = await response.json()
      setAccounts(data.accounts || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching test accounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load test accounts')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch accounts on mount
  useEffect(() => {
    fetchAccounts()
  }, [])

  // Handle taking an account
  const handleTake = async (accountId: string) => {
    try {
      setLoadingId(accountId)
      const response = await fetch(`/api/test-accounts/${accountId}/take`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to take test account')
      }

      // Re-fetch accounts to update UI
      await fetchAccounts()
    } catch (err) {
      console.error('Error taking test account:', err)
      setError(err instanceof Error ? err.message : 'Failed to take test account')
    } finally {
      setLoadingId(null)
    }
  }

  // Handle releasing an account
  const handleRelease = async (accountId: string) => {
    try {
      setLoadingId(accountId)
      const response = await fetch(`/api/test-accounts/${accountId}/release`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to release test account')
      }

      // Re-fetch accounts to update UI
      await fetchAccounts()
    } catch (err) {
      console.error('Error releasing test account:', err)
      setError(err instanceof Error ? err.message : 'Failed to release test account')
    } finally {
      setLoadingId(null)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    )
  }

  // Empty state
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No test accounts available.</p>
      </div>
    )
  }

  // Separate available and in-use accounts
  const availableAccounts = accounts.filter(acc => acc.is_available)
  const inUseAccounts = accounts.filter(acc => !acc.is_available)

  return (
    <div className="space-y-8">
      {/* Available Accounts */}
      {availableAccounts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-green-900 mb-3">
            Available Accounts ({availableAccounts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableAccounts.map(account => (
              <TestAccountCard
                key={account.id}
                account={account}
                onTake={handleTake}
                onRelease={handleRelease}
                isLoading={loadingId === account.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* In-Use Accounts */}
      {inUseAccounts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-red-900 mb-3">
            In Use ({inUseAccounts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inUseAccounts.map(account => (
              <TestAccountCard
                key={account.id}
                account={account}
                onTake={handleTake}
                onRelease={handleRelease}
                isLoading={loadingId === account.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
