'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { SlotContact } from '@/types/database'

/**
 * "Show contact" button. Contact details are fetched only on click and only
 * from the login-gated /api/slots/:id/contact; anonymous visitors are sent to
 * log in and never receive a phone number.
 */
export default function ContactReveal({ slotId, loggedIn }: { slotId: string; loggedIn: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const [contact, setContact] = useState<SlotContact | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!loggedIn) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => router.push(`/login?redirect=${encodeURIComponent(pathname)}`)}
      >
        Log in to see contact
      </Button>
    )
  }

  if (contact) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
        <p className="font-medium text-gray-900">
          {contact.name} · Unit {contact.unit_number}
        </p>
        {contact.phone && (
          <p>
            Phone:{' '}
            <a className="font-medium text-blue-700 underline" href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}>
              {contact.phone}
            </a>
          </p>
        )}
        {contact.contact_viber && <p>Viber: <span className="font-medium">{contact.contact_viber}</span></p>}
      </div>
    )
  }

  const reveal = async () => {
    setLoading(true)
    setError('')
    const response = await fetch(`/api/slots/${slotId}/contact`)
    const data = await response.json().catch(() => ({}))
    setLoading(false)
    if (response.ok) setContact(data.contact)
    else setError(data.error || 'Could not load contact details')
  }

  return (
    <div className="space-y-2">
      <Button size="sm" className="w-full" onClick={reveal} disabled={loading}>
        {loading ? 'Loading…' : 'Show contact'}
      </Button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
