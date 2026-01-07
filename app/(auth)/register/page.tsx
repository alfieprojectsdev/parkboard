// app/(auth)/register/page.tsx
'use client'

// Force dynamic rendering - prevent static pre-render at build time
// This allows Supabase client to initialize at runtime when env vars are available
export const dynamic = 'force-dynamic'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    community_code: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    unit_number: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister(e: FormEvent) {
      e.preventDefault()
      setLoading(true)
      setError(null)  // Clear previous errors

      try {
        // Validate
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }

        // Call API
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            community_code: formData.community_code,
            email: formData.email,
            password: formData.password,
            name: formData.name,
            phone: formData.phone,
            unit_number: formData.unit_number
          })
        })

        const data = await response.json()

        // Handle API errors
        if (!response.ok) {
          // API returned an error
          throw new Error(data.error || 'Registration failed')
        }

        // API succeeded - try to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })

        if (signInError) {
          // Account created but auto-login failed
          // Redirect to login page instead
          alert('Account created successfully! Please sign in.')
          router.push('/login')
          return
        }

        // Both registration and login succeeded
        // Use window.location.href to force full page reload
        // This ensures server picks up fresh session from cookies
        window.location.href = '/'

      } catch (err: unknown) {
        const error = err as Error
        console.error('Registration error:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <p className="text-sm text-gray-600">Join ParkBoard marketplace</p>
        </CardHeader>
        <CardContent>
          {/* 🧪 MVP TESTING: Note about test users */}
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs font-semibold text-yellow-900 mb-2">MVP Testing Note:</p>
            <div className="text-xs text-yellow-800">
              <p>Test community code: <span className="font-mono font-bold">lmr_x7k9p2</span></p>
              <p className="mt-1">Test users (user1-user20@parkboard.test) are already available.</p>
              <p className="mt-1">You can register a new account or use existing test credentials on the login page.</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">

            {/* Community Code */}
            <div>
              <label htmlFor="community_code" className="block text-sm font-medium mb-1">
                Community Code
              </label>
              <Input
                id="community_code"
                type="text"
                required
                value={formData.community_code}
                onChange={(e) => setFormData({ ...formData, community_code: e.target.value })}
                placeholder="Provided by your building admin"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the code shared in your building&apos;s group chat
              </p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Dela Cruz"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+639171234567"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: +63 followed by 10 digits
              </p>
            </div>

            {/* Unit Number */}
            <div>
              <label htmlFor="unit_number" className="block text-sm font-medium mb-1">
                Unit Number
              </label>
              <Input
                id="unit_number"
                type="text"
                required
                value={formData.unit_number}
                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                placeholder="10A"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                minLength={12}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 12 characters for security
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={12}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••••••"
              />
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>

            {/* Link to Login */}
            <div className="text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}