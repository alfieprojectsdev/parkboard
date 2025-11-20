import { NextRequest, NextResponse } from 'next/server'
import { getConnection } from '@/lib/db/connection'

/**
 * POST /api/test-accounts/[id]/take
 *
 * Marks a test account as in-use.
 * Only available test accounts can be taken.
 *
 * @param params.id - User UUID of the test account
 *
 * Response:
 *   200: Test account successfully marked as in-use
 *   400: Invalid account ID format
 *   404: Account not found or not a test account
 *   409: Account already in use
 *   500: Server error
 *
 * Example Success Response:
 * {
 *   success: true,
 *   account: {
 *     id: 'uuid',
 *     name: 'Test User 1',
 *     taken_at: '2025-11-20T12:00:00Z'
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = params.id

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(accountId)) {
      return NextResponse.json(
        { error: 'Invalid account ID format' },
        { status: 400 }
      )
    }

    // Get database connection
    const db = await getConnection()

    // First, check if account exists and is a test account
    const checkResult = await db.query(
      `SELECT id, name, is_test_account, test_account_in_use
       FROM users
       WHERE id = $1`,
      [accountId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const account = checkResult.rows[0]

    if (!account.is_test_account) {
      return NextResponse.json(
        { error: 'Not a test account' },
        { status: 404 }
      )
    }

    if (account.test_account_in_use) {
      return NextResponse.json(
        { error: 'Account already in use' },
        { status: 409 }
      )
    }

    // Mark account as in-use
    const updateResult = await db.query(
      `UPDATE users
       SET
         test_account_in_use = true,
         test_account_taken_at = NOW(),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, test_account_taken_at as taken_at`,
      [accountId]
    )

    return NextResponse.json(
      {
        success: true,
        account: updateResult.rows[0]
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error taking test account:', error)
    return NextResponse.json(
      { error: 'Failed to take test account' },
      { status: 500 }
    )
  }
}
