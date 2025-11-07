import { NextRequest, NextResponse } from 'next/server'
import { getConnection } from '@/lib/db/connection'

/**
 * POST /api/banners/[id]/impression
 *
 * Tracks when a banner is displayed to a user.
 * Increments the impression counter for analytics.
 *
 * @param params.id - Banner UUID
 *
 * Response:
 *   200: Impression tracked successfully
 *   400: Invalid banner ID
 *   500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bannerId = params.id

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(bannerId)) {
      return NextResponse.json(
        { error: 'Invalid banner ID format' },
        { status: 400 }
      )
    }

    // Get database connection
    const db = await getConnection()

    // Use the helper function from migration
    await db.query('SELECT increment_banner_impression($1)', [bannerId])

    return NextResponse.json(
      { success: true, message: 'Impression tracked' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error tracking impression:', error)
    return NextResponse.json(
      { error: 'Failed to track impression' },
      { status: 500 }
    )
  }
}
