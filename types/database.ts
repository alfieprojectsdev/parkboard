// types/database.ts
// Shapes returned by the v2 API routes. Contact details (phone, Viber) appear
// only in SlotContact, which only GET /api/slots/:id/contact returns.

export type SlotStatus = 'available' | 'taken' | 'expired'

export interface Slot {
  id: string
  location_level: string
  location_tower: string
  location_landmark: string | null
  available_from: string
  available_until: string
  status: SlotStatus
  notes: string | null
  created_at: string
  /** Present only for logged-in viewers. */
  owner_name?: string
  /** True when the logged-in viewer posted this slot. */
  is_mine: boolean
}

export interface SlotContact {
  name: string
  unit_number: string
  phone: string | null
  contact_viber: string | null
}

export interface Profile {
  id: string
  email: string
  name: string
  unit_number: string
  phone: string | null
  contact_viber: string | null
}
