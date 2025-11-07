import { NextRequest, NextResponse } from 'next/server'
import { getConnection } from '@/lib/db/connection'

/**
 * GET /api/banners?placement=header
 *
 * Fetches active banner for specified placement.
 * Returns highest priority active banner that hasn't expired.
 *
 * Query Parameters:
 *   - placement: 'header' | 'sidebar' | 'footer' | 'inline'
 *
 * Response:
 *   200: Banner data
 *   404: No active banner found
 *   400: Invalid placement parameter
 *   500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const placement = searchParams.get('placement')

    // Validate placement parameter
    const validPlacements = ['header', 'sidebar', 'footer', 'inline']
    if (!placement || !validPlacements.includes(placement)) {
      return NextResponse.json(
        { error: 'Invalid placement. Must be one of: header, sidebar, footer, inline' },
        { status: 400 }
      )
    }

    // Get database connection
    const db = await getConnection()

    // Use the helper function from migration
    const result = await db.query(
      'SELECT * FROM get_active_banner($1)',
      [placement]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'No active banner found for this placement' },
        { status: 404 }
      )
    }

    const banner = result.rows[0]

    return NextResponse.json(banner, { status: 200 })

  } catch (error) {
    console.error('Error fetching banner:', error)
    return NextResponse.json(
      { error: 'Failed to fetch banner' },
      { status: 500 }
    )
  }
}
