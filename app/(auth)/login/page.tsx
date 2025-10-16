// app/(auth)/login/page.tsx - Login with email/OAuth (Google, Facebook)
// ============================================================================
// LOGIN PAGE COMPONENT
// ============================================================================
// This is a Client Component that handles user login
//
// 🎓 LEARNING: Page Component vs Regular Component
// ----------------------------------------------------------------------------
// Page component: app/(auth)/login/page.tsx
// - File name "page.tsx" makes it a routable page
// - URL: /login (based on folder structure)
// - export default function is required for pages
//
// Regular component: components/MyComponent.tsx
// - Not routable, used inside pages
// - Can have any file name
// ----------------------------------------------------------------------------

'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  // 🎓 LEARNING: Controlled Inputs Pattern
  // --------------------------------------------------------------------------
  // "Controlled input" = Input value controlled by React state
  //
  // HTML input (uncontrolled):
  // <input type="text" />  ← Browser manages value, React doesn't know it
  //
  // React controlled input:
  // <input value={email} onChange={(e) => setEmail(e.target.value)} />
  //        ^                         ^
  //        React controls value      Update state on change
  //
  // Why controlled?
  // - React always knows current value (can validate, transform, etc.)
  // - Single source of truth (state, not DOM)
  // - Can programmatically set/clear (setEmail(''))
  //
  // Trade-off: More verbose, but more powerful
  // --------------------------------------------------------------------------
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // 🎓 LEARNING: Loading state for async operations
  // --------------------------------------------------------------------------
  // Why track loading?
  // - Disable submit button (prevent double-submit)
  // - Show "Logging in..." text (user feedback)
  // - Prevent form changes during submission
  //
  // Pattern:
  // 1. User clicks submit → setLoading(true)
  // 2. API call in progress → button disabled
  // 3. API returns → setLoading(false)
  // --------------------------------------------------------------------------
  const [loading, setLoading] = useState(false)

  // 🎓 LEARNING: Error state for user feedback
  // --------------------------------------------------------------------------
  // string | null type:
  // - null = No error
  // - string = Error message to display
  //
  // Why nullable?
  // - Start with null (no error)
  // - Set to string when error occurs
  // - Clear to null when user retries
  //
  // Alternative: boolean + separate message state (more complex)
  // --------------------------------------------------------------------------
  const [error, setError] = useState<string | null>(null)

  // Email/Password Login Handler
  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        throw signInError
      }

      // 🎓 LEARNING: Why router.refresh() before router.push()
      // ----------------------------------------------------------------------
      // Problem: Supabase saved session to cookies, but Next.js server hasn't
      //          refreshed yet. Middleware/auth checks don't see new session.
      //
      // Solution: router.refresh() tells Next.js to refetch server data
      //          (including auth session) before navigating.
      //
      // Flow:
      // 1. Supabase saves session → Cookies updated ✅
      // 2. router.refresh() → Next.js refetches server state ✅
      // 3. router.push('/') → Navigate with fresh session ✅
      // ----------------------------------------------------------------------
      router.refresh()
      router.push('/')

    } catch (err: unknown) {
      const error = err as Error
      console.error('Login error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // ⏸️ COMMENTED OUT FOR MVP TESTING: OAuth handlers
  // Uncomment when OAuth providers are configured in Supabase
  /*
  // Google OAuth Login Handler
  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (oauthError) throw oauthError

      // Supabase will redirect to Google login page
      // User will be redirected back to /auth/callback after login

    } catch (err: unknown) {
      const error = err as Error
      console.error('Google login error:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  // Facebook OAuth Login Handler
  async function handleFacebookLogin() {
    setLoading(true)
    setError(null)

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (oauthError) throw oauthError

      // Supabase will redirect to Facebook login page
      // User will be redirected back to /auth/callback after login

    } catch (err: unknown) {
      const error = err as Error
      console.error('Facebook login error:', error)
      setError(error.message)
      setLoading(false)
    }
  }
  */

  // 🎓 LEARNING: JSX Return (Render UI)
  // --------------------------------------------------------------------------
  // Everything after "return" is JSX (JavaScript XML)
  // Looks like HTML, but it's JavaScript that React converts to DOM
  //
  // Key differences from HTML:
  // - className not class (class is reserved in JS)
  // - htmlFor not for (for is reserved in JS)
  // - onClick not onclick (camelCase for events)
  // - Style object not string: style={{ color: 'red' }}
  // - Self-closing tags must have /: <input /> not <input>
  // --------------------------------------------------------------------------
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <p className="text-sm text-gray-600">Sign in to ParkBoard</p>
        </CardHeader>
        <CardContent>
          {/* 🧪 MVP TESTING: Test Credentials Banner */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs font-semibold text-blue-900 mb-2">Test Credentials:</p>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>Email:</strong> user1@parkboard.test</p>
              <p><strong>Password:</strong> test123456</p>
              <p className="text-blue-600 mt-2 italic">More test users: user2-user20@parkboard.test</p>
            </div>
          </div>

          {/* ⏸️ COMMENTED OUT FOR MVP TESTING: OAuth Login (Google/Facebook) */}
          {/* Uncomment when OAuth providers are configured in Supabase */}
          {/*
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleFacebookLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with email</span>
            </div>
          </div>
          */}

          {/* 🎓 LEARNING: Form element with onSubmit
              ----------------------------------------------------------------------
              <form onSubmit={handleLogin}>
                     ^
                     Called when user submits (Enter key or button click)

              Must be a function that accepts FormEvent
              handleLogin will call e.preventDefault() to stop browser submission
              ---------------------------------------------------------------------- */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email Input - Controlled Component */}
            <div>
              {/* 🎓 LEARNING: htmlFor attribute
                  ------------------------------------------------------------------
                  <label htmlFor="email">
                         ^
                         Links label to input (clicking label focuses input)

                  Must match input's id attribute
                  In HTML it's "for", in JSX it's "htmlFor" (for is reserved)
                  ------------------------------------------------------------------ */}
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>

              {/* 🎓 LEARNING: Controlled Input Props
                  ------------------------------------------------------------------
                  value={email}
                  - Input shows this value (state controls it)

                  onChange={(e) => setEmail(e.target.value)}
                  - When user types, update state
                  - e: Event object
                  - e.target: The input element
                  - e.target.value: Current text in input

                  required
                  - HTML5 validation (browser checks before submit)
                  - Prevents empty submission

                  autoComplete="email"
                  - Tells browser this is an email field
                  - Browser can suggest saved emails
                  ------------------------------------------------------------------ */}
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            {/* Password Input - Same pattern as Email */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
              />
            </div>

            {/* 🎓 LEARNING: Conditional Rendering
                ----------------------------------------------------------------------
                {error && <Alert>...</Alert>}
                  ^
                  Short-circuit evaluation

                How it works:
                - If error is null/false: Nothing renders
                - If error is truthy: Alert renders

                Same as:
                {error ? <Alert>{error}</Alert> : null}

                But shorter and more common for "show if exists" pattern
                ---------------------------------------------------------------------- */}
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            {/* 🎓 LEARNING: Button with dynamic content
                ----------------------------------------------------------------------
                disabled={loading}
                - If loading is true, button is disabled
                - Prevents double-submit while API call in progress

                {loading ? 'Signing in...' : 'Sign In'}
                - Ternary operator: condition ? ifTrue : ifFalse
                - Shows different text based on loading state
                - User feedback: "I'm working on it!"
                ---------------------------------------------------------------------- */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            {/* 🎓 LEARNING: Next.js Link Component
                ----------------------------------------------------------------------
                <Link href="/register">
                      ^
                      Client-side navigation (no page reload)

                Different from <a href="...">:
                - <a>: Full page reload, lose state
                - <Link>: SPA navigation, keep state, faster

                Next.js automatically:
                - Prefetches linked pages (faster navigation)
                - Handles browser history
                - Scrolls to top on navigation
                ---------------------------------------------------------------------- */}
            <div className="text-center text-sm">
              <span className="text-gray-600">Don&apos;t have an account? </span>
              <Link href="/register" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// 🎓 RECAP: Login Flow (User Perspective)
// ============================================================================
// 1. User visits /login
// 2. Types email and password (controlled inputs update state)
// 3. Clicks "Sign In" (or presses Enter)
//    → handleLogin() called
//    → e.preventDefault() stops browser submission
// 4. setLoading(true) → Button shows "Signing in..." and disables
// 5. API call: supabase.auth.signInWithPassword()
// 6. If error:
//    → catch block → setError(message)
//    → Alert shows error
//    → finally → setLoading(false) → Button re-enables
// 7. If success:
//    → Session saved in cookies
//    → router.push('/slots') → Redirects to slots page
//    → AuthWrapper detects session → Fetches profile → Renders app
//
// ============================================================================
// 🎓 KEY CONCEPTS DEMONSTRATED
// ============================================================================
// ✅ Controlled inputs: value={state} onChange={setState}
// ✅ Form handling: onSubmit + preventDefault()
// ✅ Async/await in event handlers
// ✅ Error handling: try/catch/finally
// ✅ Loading states: Disable UI during operations
// ✅ Conditional rendering: {condition && <JSX>}
// ✅ Dynamic content: {condition ? <A> : <B>}
// ✅ Next.js Link: Client-side navigation
// ✅ TypeScript types: FormEvent, useState<string>
//
// ============================================================================