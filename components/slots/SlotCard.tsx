'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ContactReveal from './ContactReveal'
import { formatWhen } from './format'
import type { Slot } from '@/types/database'

const STATUS_STYLE: Record<Slot['status'], string> = {
  available: 'bg-green-100 text-green-800',
  taken: 'bg-amber-100 text-amber-800',
  expired: 'bg-gray-200 text-gray-700',
}

export default function SlotCard({ slot, loggedIn }: { slot: Slot; loggedIn: boolean }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between gap-2 text-lg">
          <Link href={`/LMR/slots/${slot.id}`} className="hover:underline">
            {slot.location_level} · {slot.location_tower}
          </Link>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[slot.status]}`}>
            {slot.is_mine ? `Yours · ${slot.status}` : slot.status}
          </span>
        </CardTitle>
        {slot.location_landmark && <p className="text-sm text-gray-600">{slot.location_landmark}</p>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
          <p>
            <span className="text-gray-600">From </span>
            <span className="font-medium">{formatWhen(slot.available_from)}</span>
          </p>
          <p>
            <span className="text-gray-600">Until </span>
            <span className="font-medium">{formatWhen(slot.available_until)}</span>
          </p>
        </div>
        {slot.notes && <p className="italic text-gray-700">“{slot.notes}”</p>}
        {slot.owner_name && !slot.is_mine && <p className="text-gray-600">Posted by {slot.owner_name}</p>}
        <div className="mt-auto">
          {slot.is_mine ? (
            <Link
              href={`/LMR/slots/${slot.id}`}
              className="block rounded-md border border-gray-300 px-3 py-2 text-center font-medium hover:bg-gray-50"
            >
              Manage
            </Link>
          ) : slot.status === 'available' ? (
            <ContactReveal slotId={slot.id} loggedIn={loggedIn} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
