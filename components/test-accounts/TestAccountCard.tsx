'use client'

import { Button } from '@/components/ui/button'

interface TestAccount {
  id: string
  name: string
  unit_number: string
  email: string
  is_available: boolean
  test_account_taken_at: string | null
  test_account_released_at: string | null
}

interface TestAccountCardProps {
  account: TestAccount
  onTake: (id: string) => void
  onRelease: (id: string) => void
  isLoading?: boolean
}

export default function TestAccountCard({
  account,
  onTake,
  onRelease,
  isLoading = false
}: TestAccountCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const takenDate = formatDate(account.test_account_taken_at)

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header with status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className={`text-lg font-semibold ${!account.is_available ? 'line-through text-gray-400' : ''}`}>
              {account.name}
            </div>
            <p className="text-sm text-gray-600">Unit {account.unit_number}</p>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {account.is_available ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                <span className="text-lg">✅</span>
                Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                <span className="text-lg">❌</span>
                In Use
              </span>
            )}
          </div>
        </div>

        {/* Email */}
        <p className="text-xs text-gray-500 break-all">{account.email}</p>

        {/* In-use timestamp */}
        {takenDate && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
            In use since: {takenDate}
          </div>
        )}

        {/* Action button */}
        <Button
          onClick={() => (account.is_available ? onTake(account.id) : onRelease(account.id))}
          disabled={isLoading}
          variant={account.is_available ? 'default' : 'destructive'}
          size="sm"
          className="w-full"
          aria-label={
            account.is_available
              ? `Take test account ${account.name}`
              : `Release test account ${account.name}`
          }
        >
          {isLoading ? 'Processing...' : account.is_available ? 'Take Account' : 'Release Account'}
        </Button>
      </div>
    </div>
  )
}
