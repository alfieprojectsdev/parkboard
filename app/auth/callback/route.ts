// app/auth/callback/route.ts - OAuth callback handler
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()

    // ═══════════════════════════════════════════════════════════════
    // EXCHANGE AUTH CODE FOR SESSION
    // ═══════════════════════════════════════════════════════════════

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
    }

    // ═══════════════════════════════════════════════════════════════
    // CREATE/UPDATE USER PROFILE
    // ═══════════════════════════════════════════════════════════════

    const user = data.user

    if (user) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // Create new profile from OAuth data
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata.full_name || user.email!.split('@')[0],
            phone: user.user_metadata.phone || '',  // Will need to collect later
            unit_number: '',  // Will need to collect later
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Don't block login, redirect to profile completion page
          return NextResponse.redirect(`${origin}/profile/complete`)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // REDIRECT TO APP
    // ═══════════════════════════════════════════════════════════════

    return NextResponse.redirect(`${origin}/slots`)
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
