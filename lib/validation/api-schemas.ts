// lib/validation/api-schemas.ts
// Request validation for the v2 contact board (zod 4). The database has
// matching CHECK constraints; these turn bad input into a 400 with a message
// the form can show instead of a 500.

import { z } from 'zod'
import { LEVELS, TOWERS } from '@/lib/slot-options'

export { LEVELS, TOWERS }

const DAY_MS = 24 * 60 * 60 * 1000
export const MAX_WINDOW_DAYS = 90

/** Trimmed optional text; empty string becomes null. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .nullish()
    .transform((value) => (value ? value : null))

const email = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.email('Enter a valid email address').max(254)
)

const password = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(200, 'Password must be at most 200 characters')

const name = z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters')
const unitNumber = z.string().trim().min(1, 'Unit number is required').max(20, 'Unit number must be at most 20 characters')
const phone = optionalText(30, 'Phone')
const viber = optionalText(60, 'Viber')

const reachable = (d: { phone?: string | null; contact_viber?: string | null }) => Boolean(d.phone || d.contact_viber)
const REACHABLE_MESSAGE = 'Add a phone number or Viber so neighbours can reach you'

export const SignupSchema = z
  .object({ email, password, name, unit_number: unitNumber, phone, contact_viber: viber })
  .refine(reachable, { message: REACHABLE_MESSAGE, path: ['phone'] })

export const ProfileUpdateSchema = z
  .object({
    name: name.optional(),
    unit_number: unitNumber.optional(),
    phone,
    contact_viber: viber,
    current_password: z.string().optional(),
    new_password: password.optional(),
  })
  .refine((d) => !d.new_password || !!d.current_password, {
    message: 'Enter your current password to set a new one',
    path: ['current_password'],
  })

const timestamp = z.iso.datetime({ offset: true, message: 'Use a valid date and time' })

const slotFields = {
  location_level: z.enum(LEVELS, 'Choose a parking level'),
  location_tower: z.enum(TOWERS, 'Choose a tower'),
  location_landmark: optionalText(100, 'Landmark'),
  available_from: timestamp,
  available_until: timestamp,
  notes: optionalText(500, 'Notes'),
}

/** Shared by create and update once the final from/until are known. */
export function windowProblem(from: Date, until: Date): string | null {
  if (until <= from) return 'End time must be after start time'
  if (until.getTime() <= Date.now()) return 'End time must be in the future'
  if (until.getTime() - from.getTime() > MAX_WINDOW_DAYS * DAY_MS) {
    return `A post can cover at most ${MAX_WINDOW_DAYS} days; post again after that`
  }
  return null
}

export const CreateSlotSchema = z.object(slotFields).superRefine((d, ctx) => {
  const problem = windowProblem(new Date(d.available_from), new Date(d.available_until))
  if (problem) ctx.addIssue({ code: 'custom', message: problem, path: ['available_until'] })
})

export const UpdateSlotSchema = z
  .object({
    location_level: slotFields.location_level.optional(),
    location_tower: slotFields.location_tower.optional(),
    location_landmark: slotFields.location_landmark.optional(),
    available_from: timestamp.optional(),
    available_until: timestamp.optional(),
    notes: slotFields.notes.optional(),
    // Owners can mark a slot taken and re-open it. Removal is DELETE.
    status: z.enum(['available', 'taken']).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: 'Nothing to update' })

export const FeedbackSchema = z.object({
  kind: z.enum(['problem', 'idea', 'other']).catch('other'),
  message: z.string().trim().min(1, 'Please write a message').max(2000, 'Message must be under 2000 characters'),
  contact: optionalText(200, 'Contact'),
  page: z
    .string()
    .nullish()
    .transform((p) => (p ? p.split(/[?#]/)[0].slice(0, 300) : null)),
})

/** First human-readable message from a failed parse. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request'
}
