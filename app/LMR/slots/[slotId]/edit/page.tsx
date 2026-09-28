'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navigation from '@/components/common/Navigation'
import SlotForm, { type SlotFormValues } from '@/components/slots/SlotForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Slot } from '@/types/database'

// Owner only: the API returns 403 for anyone else, and this page only shows
// the form when the slot says is_mine.
export default function EditSlotPage() {
  const { slotId } = useParams<{ slotId: string }>()
  const router = useRouter()
  const [slot, setSlot] = useState<Slot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/slots/${slotId}`)
      .then(async (response) => {
        const data = await response.json()
        if (cancelled) return
        if (!response.ok) setError(data.error || 'Slot not found')
        else if (!data.slot.is_mine) setError('Only the owner can edit this slot')
        else if (data.slot.status === 'expired') setError('This slot has been removed')
        else setSlot(data.slot)
      })
      .catch(() => !cancelled && setError('Could not load the slot'))
    return () => {
      cancelled = true
    }
  }, [slotId])

  const save = async (values: SlotFormValues) => {
    const response = await fetch(`/api/slots/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return data.error || 'Could not save your changes'
    router.push(`/LMR/slots/${slotId}`)
    return null
  }

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Edit slot</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</p>
            ) : !slot ? (
              <p className="py-8 text-center text-gray-600">Loading…</p>
            ) : (
              <SlotForm
                initial={slot}
                submitLabel="Save changes"
                onSubmit={save}
                onCancel={() => router.push(`/LMR/slots/${slotId}`)}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}
