'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const FIELDS = [
  { id: 'name', label: 'Your name', type: 'text', autoComplete: 'name', required: true },
  { id: 'unit_number', label: 'Unit number', type: 'text', autoComplete: 'off', required: true, placeholder: 'e.g. 12B' },
  { id: 'email', label: 'Email', type: 'email', autoComplete: 'email', required: true },
  { id: 'password', label: 'Password (12+ characters)', type: 'password', autoComplete: 'new-password', required: true },
  { id: 'confirm', label: 'Confirm password', type: 'password', autoComplete: 'new-password', required: true },
  { id: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', required: false, placeholder: '09XX XXX XXXX' },
  { id: 'contact_viber', label: 'Viber number or name', type: 'text', autoComplete: 'off', required: false },
] as const

type FieldId = (typeof FIELDS)[number]['id']

export default function RegisterForm({ inviteRequired }: { inviteRequired: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState<Record<FieldId, string>>({
    name: '',
    unit_number: '',
    email: '',
    password: '',
    confirm: '',
    phone: '',
    contact_viber: '',
  })
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 12) return setError('Password must be at least 12 characters')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    if (!form.phone.trim() && !form.contact_viber.trim()) {
      return setError('Add a phone number or Viber so neighbours can reach you')
    }

    setLoading(true)
    const body = { ...form, confirm: undefined, invite_code: inviteRequired ? inviteCode : undefined }
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setLoading(false)
      return setError(data.error || 'Could not create your account')
    }

    // Same credentials straight into NextAuth: proves signup and login agree.
    const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    setLoading(false)
    if (result?.error) return router.push('/login')
    router.push('/LMR/slots')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <p className="text-sm text-gray-600">
            For Lumiere Residences residents. Your phone or Viber is shown only to logged-in neighbours who ask for it.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {inviteRequired && (
              <div>
                <label htmlFor="invite_code" className="mb-1 block text-sm font-medium">
                  Residents&apos; code <span className="font-normal text-gray-500">(from the building group chat)</span>
                </label>
                <Input
                  id="invite_code"
                  autoComplete="off"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
            )}
            {FIELDS.map((field) => (
              <div key={field.id}>
                <label htmlFor={field.id} className="mb-1 block text-sm font-medium">
                  {field.label}
                  {!field.required && <span className="font-normal text-gray-500"> (phone or Viber required)</span>}
                </label>
                <Input
                  id={field.id}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  required={field.required}
                  placeholder={'placeholder' in field ? field.placeholder : undefined}
                  value={form[field.id]}
                  onChange={(e) => setForm({ ...form, [field.id]: e.target.value })}
                />
              </div>
            ))}
            {error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Already registered?{' '}
            <Link href="/login" className="text-blue-700 underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
