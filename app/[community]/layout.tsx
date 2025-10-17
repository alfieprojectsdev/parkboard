import { notFound } from 'next/navigation'
import { CommunityProvider } from '@/lib/context/CommunityContext'

// Valid community codes (TODO: fetch from database in future)
const VALID_COMMUNITIES = ['LMR', 'SRP', 'BGC']

/**
 * Community Layout
 * Handles all routes under /[community]/*
 *
 * Features:
 * - Validates community code exists
 * - Fetches community details from database
 * - Sets community context for RLS policies
 * - Provides community data to child components
 */
export default async function CommunityLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { community: string }
}) {
  // Normalize community code to uppercase
  const communityCode = params.community.toUpperCase()

  // Validate community code format (2-4 uppercase letters)
  if (!/^[A-Z]{2,4}$/.test(communityCode)) {
    notFound()
  }

  // Quick validation against known communities
  // TODO: Remove this check once database-driven validation is complete
  if (!VALID_COMMUNITIES.includes(communityCode)) {
    notFound()
  }

  // TEMPORARY: Hardcoded community data (until migrations are run)
  // TODO: Replace with database query after running migrations 002 & 003
  const communityData = {
    LMR: { code: 'LMR', name: 'Lumiere', displayName: 'Lumiere Residences' },
    SRP: { code: 'SRP', name: 'Serendra', displayName: 'Serendra' },
    BGC: { code: 'BGC', name: 'BGC', displayName: 'Bonifacio Global City' }
  }

  const community = communityData[communityCode as keyof typeof communityData]

  if (!community) {
    notFound()
  }

  // TEMPORARY: Skip database queries until migrations are run
  // Uncomment after running migrations 002 & 003:
  //
  // const supabase = createClient()
  // const { data: community, error } = await supabase
  //   .from('communities')
  //   .select('community_code, name, display_name, status')
  //   .eq('community_code', communityCode)
  //   .eq('status', 'active')
  //   .single()
  //
  // if (error || !community) {
  //   console.error('Community not found:', communityCode, error)
  //   notFound()
  // }
  //
  // await supabase.rpc('set_community_context', {
  //   p_community_code: communityCode
  // })

  // Provide community context to all child components
  return (
    <CommunityProvider
      value={{
        code: community.code,
        name: community.name,
        displayName: community.displayName
      }}
    >
      {children}
    </CommunityProvider>
  )
}

/**
 * Generate Static Params
 * Pre-renders pages for known communities at build time
 */
export async function generateStaticParams() {
  // TODO: Fetch from database in production
  return VALID_COMMUNITIES.map((code) => ({
    community: code.toLowerCase()
  }))
}

/**
 * Metadata
 * Dynamic metadata based on community
 */
export async function generateMetadata({
  params
}: {
  params: { community: string }
}) {
  const communityCode = params.community.toUpperCase()

  // TEMPORARY: Hardcoded until migrations are run
  const communityData = {
    LMR: 'Lumiere Residences',
    SRP: 'Serendra',
    BGC: 'Bonifacio Global City'
  }

  const displayName = communityData[communityCode as keyof typeof communityData]

  return {
    title: displayName ? `${displayName} - ParkBoard` : 'ParkBoard',
    description: displayName
      ? `Parking marketplace for ${displayName} residents`
      : 'Condo parking marketplace'
  }
}
