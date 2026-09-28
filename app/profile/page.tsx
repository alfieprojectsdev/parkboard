'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Navigation from '@/components/common/Navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/types/database'

type Message = { kind: 'ok' | 'error'; text: string } | null

function Notice({ message }: { message: Message }) {
  if (!message) return null
  return (
    <p
      role={message.kind === 'error' ? 'alert' : 'status'}
      className={`rounded-md px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}
    >
      {message.text}
    </p>
  )
}

export default function ProfilePage() {
  const { update } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [details, setDetails] = useState({ name: '', unit_number: '', phone: '', contact_viber: '' })
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' })
  const [detailsMessage, setDetailsMessage] = useState<Message>(null)
  const [passwordMessage, setPasswordMessage] = useState<Message>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data)
        setDetails({
          name: data.name,
          unit_number: data.unit_number,
          phone: data.phone ?? '',
          contact_viber: data.contact_viber ?? '',
        })
      })
  }, [])

  const patch = async (body: object) => {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    return response.ok ? { ok: true as const, data } : { ok: false as const, error: data.error || 'Could not save' }
  }

  const saveDetails = async (e: FormEvent) => {
    e.preventDefault()
    const result = await patch(details)
    if (result.ok) await update({ name: result.data.name, unitNumber: result.data.unit_number })
    setDetailsMessage(result.ok ? { kind: 'ok', text: 'Saved.' } : { kind: 'error', text: result.error })
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    const result = await patch(passwords)
    if (result.ok) setPasswords({ current_password: '', new_password: '' })
    setPasswordMessage(result.ok ? { kind: 'ok', text: 'Password changed.' } : { kind: 'error', text: result.error })
  }

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
        {!profile ? (
          <p className="py-12 text-center text-gray-600">Loading…</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Your details</CardTitle>
                <p className="text-sm text-gray-600">{profile.email}</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveDetails} className="space-y-4">
                  {(
                    [
                      ['name', 'Name', 'text'],
                      ['unit_number', 'Unit number', 'text'],
                      ['phone', 'Phone', 'tel'],
                      ['contact_viber', 'Viber number or name', 'text'],
                    ] as const
                  ).map(([id, label, type]) => (
                    <div key={id}>
                      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
                      <Input id={id} type={type} value={details[id]} onChange={(e) => setDetails({ ...details, [id]: e.target.value })} />
                    </div>
                  ))}
                  <p className="text-xs text-gray-500">Keep at least one of phone or Viber.</p>
                  <Notice message={detailsMessage} />
                  <Button type="submit">Save details</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Change password</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={savePassword} className="space-y-4">
                  <div>
                    <label htmlFor="current_password" className="mb-1 block text-sm font-medium">Current password</label>
                    <Input
                      id="current_password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={passwords.current_password}
                      onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="new_password" className="mb-1 block text-sm font-medium">New password (12+ characters)</label>
                    <Input
                      id="new_password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                      value={passwords.new_password}
                      onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    />
                  </div>
                  <Notice message={passwordMessage} />
                  <Button type="submit">Change password</Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  )
}
