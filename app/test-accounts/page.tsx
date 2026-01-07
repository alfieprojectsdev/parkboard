import Navigation from '@/components/common/Navigation'
import TestAccountList from '@/components/test-accounts/TestAccountList'

// Force dynamic rendering - prevent static pre-render at build time
export const dynamic = 'force-dynamic'

/**
 * Test Accounts Page
 *
 * Displays a list of available and in-use test accounts for beta testing.
 * Users can take available accounts or release accounts they are currently using.
 */
export default function TestAccountsPage() {
  return (
    <>
      <Navigation />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Test Accounts for Beta Testing</h1>
          <p className="text-gray-600 mt-2">
            Select an available account to test the ParkBoard platform.
          </p>
        </div>

        <TestAccountList />
      </div>
    </>
  )
}
