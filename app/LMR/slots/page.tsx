'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Navigation from '@/components/common/Navigation'
import SlotCard from '@/components/slots/SlotCard'
import { Button } from '@/components/ui/button'
import type { Slot } from '@/types/database'

type View = 'available' | 'mine'

export default function SlotsPage() {
  const { status } = useSession()
  const loggedIn = status === 'authenticated'
  const [view, setView] = useState<View>('available')
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Primitive deps only (see CLAUDE.md: object deps caused render loops in v1).
  useEffect(() => {
    if (status === 'loading') return
    let cancelled = false
    fetch(view === 'mine' ? '/api/slots?mine=1' : '/api/slots')
      .then(async (response) => {
        const data = await response.json()
        if (cancelled) return
        if (!response.ok) throw new Error(data.error || 'Could not load slots')
        setSlots(data.slots)
        setError(null)
      })
      .catch((err: Error) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [view, status])

  const switchView = (next: View) => {
    setSlots(null)
    setView(next)
  }

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">{view === 'mine' ? 'My slots' : 'Free parking slots'}</h1>
          <Link href="/LMR/slots/new">
            <Button>Post a slot</Button>
          </Link>
        </div>

        {loggedIn && (
          <div className="mb-6 inline-flex rounded-md border bg-white p-1" role="tablist" aria-label="Which slots">
            {(['available', 'mine'] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => switchView(v)}
                className={`rounded px-3 py-1.5 text-sm font-medium ${view === v ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                {v === 'available' ? 'Available' : 'Mine'}
              </button>
            ))}
          </div>
        )}

        {error ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</p>
        ) : slots === null ? (
          <p className="py-12 text-center text-gray-600">Loading…</p>
        ) : slots.length === 0 ? (
          <div className="py-12 text-center text-gray-700">
            <p className="mb-4">{view === 'mine' ? "You haven't posted a slot yet." : 'No free slots right now.'}</p>
            <Link href="/LMR/slots/new">
              <Button>Post yours</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} loggedIn={loggedIn} />
            ))}
          </div>
        )}

        {!loggedIn && status !== 'loading' && slots && slots.length > 0 && (
          <p className="mt-6 text-center text-sm text-gray-600">
            <Link href="/login?redirect=/LMR/slots" className="text-blue-700 underline">Log in</Link> to see who posted
            and how to reach them.
          </p>
        )}
      </main>
    </>
  )
}
