// app/profile/complete/page.tsx - Profile completion for OAuth users
'use client'

// Force dynamic rendering - prevent static pre-render at build time
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthWrapper'
import AuthWrapper from '@/components/auth/AuthWrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function CompleteProfileContent() {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()

  const [phone, setPhone] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          phone: phone,
          unit_number: unitNumber
        })
        .eq('id', user!.id)

      if (updateError) throw updateError

      router.push('/slots')

    } catch (err: unknown) {
      const error = err as Error
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            We need a few more details to set up your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                id="phone"
                type="tel"
                required
                placeholder="+639171234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="unit_number" className="block text-sm font-medium mb-1">
                Unit Number <span className="text-red-500">*</span>
              </label>
              <Input
                id="unit_number"
                type="text"
                required
                placeholder="10A"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-800 text-sm p-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <AuthWrapper>
      <CompleteProfileContent />
    </AuthWrapper>
  )
}
