'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Navigation from '@/components/common/Navigation'
import ContactReveal from '@/components/slots/ContactReveal'
import { formatWhen } from '@/components/slots/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Slot } from '@/types/database'

export default function SlotDetailPage() {
  const { slotId } = useParams<{ slotId: string }>()
  const router = useRouter()
  const { status } = useSession()
  const [slot, setSlot] = useState<Slot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Waits for the session so is_mine / owner_name reflect the login.
  useEffect(() => {
    if (status === 'loading') return
    let cancelled = false
    fetch(`/api/slots/${slotId}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (response.ok) setSlot(data.slot)
        else setError(data.error || 'Slot not found')
      })
      .catch(() => !cancelled && setError('Could not load the slot'))
    return () => {
      cancelled = true
    }
  }, [slotId, status])

  const change = async (method: 'PATCH' | 'DELETE', body?: object) => {
    setBusy(true)
    setError(null)
    const response = await fetch(`/api/slots/${slotId}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) return setError(data.error || 'Could not update the slot')
    if (method === 'DELETE') router.push('/LMR/slots')
    else setSlot(data.slot)
  }

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <Link href="/LMR/slots" className="mb-4 inline-block text-sm text-blue-700 hover:underline">
          ← All slots
        </Link>

        {error && !slot ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</p>
        ) : !slot ? (
          <p className="py-12 text-center text-gray-600">Loading…</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-2xl">
                <span>
                  {slot.location_level} · {slot.location_tower}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-gray-800">
                  {slot.status}
                </span>
              </CardTitle>
              {slot.location_landmark && <p className="text-gray-600">{slot.location_landmark}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <p>
                  <span className="text-gray-600">Free from </span>
                  <span className="font-medium">{formatWhen(slot.available_from)}</span>
                </p>
                <p>
                  <span className="text-gray-600">Until </span>
                  <span className="font-medium">{formatWhen(slot.available_until)}</span>
                </p>
              </div>
              {slot.notes && <p className="italic text-gray-700">“{slot.notes}”</p>}
              {slot.owner_name && !slot.is_mine && <p className="text-gray-600">Posted by {slot.owner_name}</p>}

              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

              {slot.is_mine ? (
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium text-gray-900">This is your slot</p>
                  <div className="flex flex-wrap gap-2">
                    {slot.status === 'available' && (
                      <Button disabled={busy} onClick={() => change('PATCH', { status: 'taken' })}>
                        Mark as taken
                      </Button>
                    )}
                    {slot.status === 'taken' && (
                      <Button disabled={busy} onClick={() => change('PATCH', { status: 'available' })}>
                        Mark as available again
                      </Button>
                    )}
                    {slot.status !== 'expired' && (
                      <>
                        <Link href={`/LMR/slots/${slot.id}/edit`}>
                          <Button variant="outline" disabled={busy}>Edit</Button>
                        </Link>
                        <Button
                          variant="destructive"
                          disabled={busy}
                          onClick={() => confirm('Remove this slot from the board?') && change('DELETE')}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : slot.status === 'available' ? (
                <ContactReveal slotId={slot.id} loggedIn={status === 'authenticated'} />
              ) : (
                <p className="text-gray-600">This slot is no longer available.</p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
