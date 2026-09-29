'use client'

import { useRouter } from 'next/navigation'
import Navigation from '@/components/common/Navigation'
import SlotForm, { type SlotFormValues } from '@/components/slots/SlotForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Login is enforced by proxy.ts (this path is not in PUBLIC_PAGES) and again
// by POST /api/slots.
export default function NewSlotPage() {
  const router = useRouter()

  const create = async (values: SlotFormValues) => {
    const response = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return data.error || 'Could not post the slot. Please try again.'
    router.push(`/LMR/slots/${data.slot.id}`)
    return null
  }

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Share your parking slot</CardTitle>
            <p className="text-sm text-gray-600">
              Neighbours see the location and times. Your phone and Viber are shown only to logged-in residents who
              tap &ldquo;Show contact&rdquo;.
            </p>
          </CardHeader>
          <CardContent>
            <SlotForm submitLabel="Post slot" onSubmit={create} onCancel={() => router.push('/LMR/slots')} />
          </CardContent>
        </Card>
      </main>
    </>
  )
}
