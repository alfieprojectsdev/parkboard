import { NextResponse } from 'next/server'
import { getConnection } from '@/lib/db/connection'

/**
 * GET /api/test-accounts
 *
 * Lists all test accounts with their availability status.
 * Returns accounts sorted by availability (available first), then by name.
 *
 * Response:
 *   200: Array of test accounts with availability status
 *   500: Server error
 *
 * Example Response:
 * {
 *   accounts: [
 *     {
 *       id: 'uuid',
 *       name: 'Test User 1',
 *       unit_number: 'A-101',
 *       email: 'test1@example.com',
 *       is_available: true,
 *       test_account_taken_at: null,
 *       test_account_released_at: '2025-11-20T10:00:00Z'
 *     },
 *     {
 *       id: 'uuid',
 *       name: 'Test User 2',
 *       unit_number: 'A-102',
 *       email: 'test2@example.com',
 *       is_available: false,
 *       test_account_taken_at: '2025-11-20T11:00:00Z',
 *       test_account_released_at: null
 *     }
 *   ]
 * }
 */
export async function GET() {
  try {
    // Get database connection
    const db = await getConnection()

    // Query test accounts with availability status
    // NOT test_account_in_use gives us is_available boolean
    // Sort by availability (available first), then by name
    const result = await db.query(
      `SELECT
        id,
        name,
        unit_number,
        email,
        NOT test_account_in_use as is_available,
        test_account_taken_at,
        test_account_released_at
      FROM users
      WHERE is_test_account = true
      ORDER BY test_account_in_use ASC, name ASC`
    )

    return NextResponse.json(
      { accounts: result.rows },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching test accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test accounts' },
      { status: 500 }
    )
  }
}
