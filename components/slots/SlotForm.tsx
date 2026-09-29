'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LEVELS, TOWERS } from '@/lib/slot-options'
import { fromLocalInput, toLocalInput } from './format'
import type { Slot } from '@/types/database'

export interface SlotFormValues {
  location_level: string
  location_tower: string
  location_landmark: string | null
  available_from: string
  available_until: string
  notes: string | null
}

const selectClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'

/** Shared by "Post a slot" and "Edit slot". Times are entered in local time. */
export default function SlotForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Slot
  submitLabel: string
  onSubmit: (values: SlotFormValues) => Promise<string | null>
  onCancel: () => void
}) {
  const [level, setLevel] = useState(initial?.location_level ?? 'P1')
  const [tower, setTower] = useState(initial?.location_tower ?? TOWERS[0])
  const [landmark, setLandmark] = useState(initial?.location_landmark ?? '')
  const [from, setFrom] = useState(initial ? toLocalInput(initial.available_from) : '')
  const [until, setUntil] = useState(initial ? toLocalInput(initial.available_until) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!from || !until) return setError('Set when the slot is free, and until when')
    if (new Date(until) <= new Date(from)) return setError('End time must be after start time')

    setSaving(true)
    const problem = await onSubmit({
      location_level: level,
      location_tower: tower,
      location_landmark: landmark.trim() || null,
      available_from: fromLocalInput(from),
      available_until: fromLocalInput(until),
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (problem) setError(problem)
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset className="space-y-4 border-b pb-4">
        <legend className="mb-2 font-medium text-gray-900">Where is the slot?</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="location_level" className="mb-1 block text-sm font-medium">Parking level</label>
            <select id="location_level" className={selectClass} value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="location_tower" className="mb-1 block text-sm font-medium">Tower</label>
            <select id="location_tower" className={selectClass} value={tower} onChange={(e) => setTower(e.target.value)}>
              {TOWERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="location_landmark" className="mb-1 block text-sm font-medium">
            Landmark <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <Input
            id="location_landmark"
            maxLength={100}
            placeholder="e.g. near the elevator, corner spot"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-b pb-4">
        <legend className="mb-2 font-medium text-gray-900">When is it free?</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="available_from" className="mb-1 block text-sm font-medium">From</label>
            <Input id="available_from" type="datetime-local" required value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="available_until" className="mb-1 block text-sm font-medium">Until</label>
            <Input id="available_until" type="datetime-local" required value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          Notes <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          maxLength={500}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. compact cars only, ₱150/day, message me first"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
