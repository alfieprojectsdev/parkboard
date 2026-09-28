import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

vi.mock('@/lib/auth/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/lib/auth/auth'
import { query, resetDb } from './helpers/test-db'
import { verifyCredentials } from '@/lib/auth/credentials'
import { POST as signup } from '@/app/api/auth/signup/route'
import { GET as getProfile, PATCH as patchProfile } from '@/app/api/profile/route'
import { GET as listSlots, POST as createSlot } from '@/app/api/slots/route'
import { GET as getSlot, PATCH as patchSlot, DELETE as deleteSlot } from '@/app/api/slots/[id]/route'
import { GET as getContact } from '@/app/api/slots/[id]/contact/route'
import { POST as sendFeedback } from '@/app/api/feedback/route'

const mockedAuth = vi.mocked(auth) as unknown as { mockResolvedValue: (v: unknown) => void }

/** Make every route see this user as logged in (or nobody, with null). */
function loginAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId, name: 'x', email: 'x', unitNumber: null } } : null)
}

let ipCounter = 0
function req(url: string, method = 'GET', body?: unknown) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-real-ip': `203.0.113.${++ipCounter % 250}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function makeUser(name: string, extra: Partial<{ phone: string | null; contact_viber: string | null }> = {}) {
  const result = await query<{ id: string }>(
    `INSERT INTO user_profiles (email, password_hash, name, unit_number, phone, contact_viber)
     VALUES ($1, $2, $3, '12B', $4, $5) RETURNING id`,
    [
      `${name.toLowerCase()}@example.test`,
      await bcrypt.hash('correct horse battery', 4),
      name,
      'phone' in extra ? extra.phone : '0917-555-0101',
      'contact_viber' in extra ? extra.contact_viber : 'viber-' + name.toLowerCase(),
    ]
  )
  return result.rows[0].id
}

const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()
const slotBody = (overrides: Record<string, unknown> = {}) => ({
  location_level: 'P2',
  location_tower: 'North Tower',
  location_landmark: 'near elevator',
  available_from: hours(1),
  available_until: hours(30),
  notes: 'compact cars only',
  ...overrides,
})

async function postSlot(ownerId: string, overrides: Record<string, unknown> = {}) {
  loginAs(ownerId)
  const response = await createSlot(req('/api/slots', 'POST', slotBody(overrides)))
  expect(response.status).toBe(201)
  return (await response.json()).slot.id as string
}

beforeEach(async () => {
  await resetDb()
  loginAs(null)
})

describe('signup and login share one contract (R-002)', () => {
  it('stores a bcrypt hash that the login check accepts', async () => {
    const response = await signup(
      req('/api/auth/signup', 'POST', {
        email: '  Ana@Example.test ',
        password: 'a long enough password',
        name: 'Ana',
        unit_number: '7C',
        contact_viber: 'ana.viber',
      })
    )
    expect(response.status).toBe(201)

    const row = (await query<{ email: string; password_hash: string }>('SELECT email, password_hash FROM user_profiles')).rows[0]
    expect(row.email).toBe('ana@example.test')
    expect(row.password_hash).toMatch(/^\$2[aby]\$12\$/)

    const user = await verifyCredentials('ANA@example.test', 'a long enough password')
    expect(user).toMatchObject({ email: 'ana@example.test', name: 'Ana', unitNumber: '7C' })
    expect(await verifyCredentials('ana@example.test', 'wrong password!!')).toBeNull()
  })

  it.each([
    [{ phone: '', contact_viber: '' }, /phone number or Viber/],
    [{ password: 'short' }, /at least 12/],
    [{ email: 'not-an-email' }, /valid email/],
    [{ unit_number: '' }, /Unit number/],
  ])('rejects %j', async (overrides, message) => {
    const response = await signup(
      req('/api/auth/signup', 'POST', {
        email: 'b@example.test',
        password: 'a long enough password',
        name: 'B',
        unit_number: '1A',
        phone: '0917',
        ...overrides,
      })
    )
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(message)
  })

  it('refuses a second account for the same email in any case, without saying so', async () => {
    const body = { email: 'c@example.test', password: 'a long enough password', name: 'C', unit_number: '2', phone: '1' }
    expect((await signup(req('/api/auth/signup', 'POST', body))).status).toBe(201)
    const again = await signup(req('/api/auth/signup', 'POST', { ...body, email: 'C@Example.TEST' }))
    expect(again.status).toBe(409)
    expect((await again.json()).error).not.toMatch(/exists|taken|registered/i)
  })

  it('locks an email after 5 failed attempts, even with the right password', async () => {
    await makeUser('Dee')
    for (let i = 0; i < 5; i++) expect(await verifyCredentials('dee@example.test', `wrong-${i}`, '198.51.100.1')).toBeNull()
    expect(await verifyCredentials('dee@example.test', 'correct horse battery', '198.51.100.1')).toBeNull()
  })
})

describe('contact details stay behind the reveal endpoint (R-004)', () => {
  it('never appear in the list or detail, logged in or not', async () => {
    const owner = await makeUser('Owner', { phone: '0917-000-7777', contact_viber: 'owner.viber.handle' })
    const id = await postSlot(owner)
    const viewer = await makeUser('Viewer')

    for (const who of [null, viewer, owner]) {
      loginAs(who)
      const list = JSON.stringify(await (await listSlots(req('/api/slots'))).json())
      const detail = JSON.stringify(await (await getSlot(req(`/api/slots/${id}`), ctx(id))).json())
      for (const body of [list, detail]) {
        expect(body).not.toContain('0917-000-7777')
        expect(body).not.toContain('owner.viber.handle')
        expect(body).not.toMatch(/"phone"|"contact_viber"|"owner_id"/)
      }
    }
  })

  it('hides the owner name from anonymous visitors', async () => {
    const owner = await makeUser('Named')
    await postSlot(owner)
    loginAs(null)
    const anon = (await (await listSlots(req('/api/slots'))).json()).slots[0]
    expect(anon.owner_name).toBeUndefined()
    loginAs(await makeUser('Neighbour'))
    const member = (await (await listSlots(req('/api/slots'))).json()).slots[0]
    expect(member.owner_name).toBe('Named')
  })

  it('returns 401 to anonymous visitors and the contact to residents', async () => {
    const owner = await makeUser('Owner', { phone: '0917-000-7777', contact_viber: 'ov' })
    const id = await postSlot(owner)

    loginAs(null)
    expect((await getContact(req(`/api/slots/${id}/contact`), ctx(id))).status).toBe(401)

    loginAs(await makeUser('Viewer'))
    const response = await getContact(req(`/api/slots/${id}/contact`), ctx(id))
    expect(response.status).toBe(200)
    expect((await response.json()).contact).toEqual({ name: 'Owner', unit_number: '12B', phone: '0917-000-7777', contact_viber: 'ov' })
  })

  it('stops revealing once the slot is taken, except to the owner', async () => {
    const owner = await makeUser('Owner')
    const id = await postSlot(owner)
    await patchSlot(req(`/api/slots/${id}`, 'PATCH', { status: 'taken' }), ctx(id))

    loginAs(await makeUser('Viewer'))
    expect((await getContact(req(`/api/slots/${id}/contact`), ctx(id))).status).toBe(404)
    loginAs(owner)
    expect((await getContact(req(`/api/slots/${id}/contact`), ctx(id))).status).toBe(200)
  })

  it('limits each resident to 30 reveals an hour', async () => {
    const id = await postSlot(await makeUser('Owner'))
    loginAs(await makeUser('Scraper'))
    for (let i = 0; i < 30; i++) expect((await getContact(req(`/api/slots/${id}/contact`), ctx(id))).status).toBe(200)
    expect((await getContact(req(`/api/slots/${id}/contact`), ctx(id))).status).toBe(429)
  })

  it('answers 404, not 500, for a malformed id', async () => {
    loginAs(await makeUser('Viewer'))
    expect((await getContact(req('/api/slots/not-a-uuid/contact'), ctx('not-a-uuid'))).status).toBe(404)
    expect((await getSlot(req('/api/slots/1'), ctx('1'))).status).toBe(404)
  })
})

describe('posting slots', () => {
  it('requires a login', async () => {
    loginAs(null)
    expect((await createSlot(req('/api/slots', 'POST', slotBody()))).status).toBe(401)
  })

  it('takes the owner from the session, never the body', async () => {
    const owner = await makeUser('Real')
    const other = await makeUser('Other')
    const id = await postSlot(owner, { owner_id: other })
    const row = (await query<{ owner_id: string }>('SELECT owner_id FROM parking_slots WHERE id = $1', [id])).rows[0]
    expect(row.owner_id).toBe(owner)
  })

  it.each([
    [{ available_until: hours(0.5), available_from: hours(1) }, /after start/],
    [{ available_from: hours(-10), available_until: hours(-1) }, /future/],
    [{ available_until: hours(24 * 100) }, /at most 90 days/],
    [{ location_level: 'P9' }, /level/],
    [{ location_tower: 'South Tower' }, /tower/],
    [{ notes: 'x'.repeat(501) }, /at most 500/],
  ])('rejects %j', async (overrides, message) => {
    loginAs(await makeUser('Poster'))
    const response = await createSlot(req('/api/slots', 'POST', slotBody(overrides)))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(message)
  })

  it('does not list slots whose window has passed', async () => {
    const owner = await makeUser('Owner')
    const id = await postSlot(owner)
    await query(`UPDATE parking_slots SET available_from = NOW() - INTERVAL '2 days', available_until = NOW() - INTERVAL '1 hour' WHERE id = $1`, [id])
    expect((await (await listSlots(req('/api/slots'))).json()).slots).toHaveLength(0)
  })
})

describe('only the owner can change a slot', () => {
  it('returns 403 to other residents for edit and removal', async () => {
    const id = await postSlot(await makeUser('Owner'))
    loginAs(await makeUser('Intruder'))
    expect((await patchSlot(req(`/api/slots/${id}`, 'PATCH', { notes: 'mine now' }), ctx(id))).status).toBe(403)
    expect((await patchSlot(req(`/api/slots/${id}`, 'PATCH', { status: 'taken' }), ctx(id))).status).toBe(403)
    expect((await deleteSlot(req(`/api/slots/${id}`, 'DELETE'), ctx(id))).status).toBe(403)
    const row = (await query<{ notes: string; status: string }>('SELECT notes, status FROM parking_slots WHERE id = $1', [id])).rows[0]
    expect(row).toEqual({ notes: 'compact cars only', status: 'available' })
  })

  it('lets the owner edit, mark taken, re-open and remove (soft delete)', async () => {
    const owner = await makeUser('Owner')
    const id = await postSlot(owner)

    const edited = await patchSlot(req(`/api/slots/${id}`, 'PATCH', { notes: 'now any size', location_landmark: '' }), ctx(id))
    expect(edited.status).toBe(200)
    expect((await edited.json()).slot).toMatchObject({ notes: 'now any size', location_landmark: null, is_mine: true })

    await patchSlot(req(`/api/slots/${id}`, 'PATCH', { status: 'taken' }), ctx(id))
    expect((await (await listSlots(req('/api/slots'))).json()).slots).toHaveLength(0)
    await patchSlot(req(`/api/slots/${id}`, 'PATCH', { status: 'available' }), ctx(id))
    expect((await (await listSlots(req('/api/slots'))).json()).slots).toHaveLength(1)

    expect((await deleteSlot(req(`/api/slots/${id}`, 'DELETE'), ctx(id))).status).toBe(200)
    const row = (await query<{ status: string }>('SELECT status FROM parking_slots WHERE id = $1', [id])).rows[0]
    expect(row.status).toBe('expired')
    expect((await (await listSlots(req('/api/slots'))).json()).slots).toHaveLength(0)
    expect((await deleteSlot(req(`/api/slots/${id}`, 'DELETE'), ctx(id))).status).toBe(404)
  })

  it('shows the owner every one of their slots under ?mine=1', async () => {
    const owner = await makeUser('Owner')
    const a = await postSlot(owner)
    await postSlot(owner)
    await deleteSlot(req(`/api/slots/${a}`, 'DELETE'), ctx(a))
    await postSlot(await makeUser('Someone'))

    loginAs(owner)
    const mine = (await (await listSlots(req('/api/slots?mine=1'))).json()).slots
    expect(mine.map((s: { status: string }) => s.status).sort()).toEqual(['available', 'expired'])
    loginAs(null)
    expect((await listSlots(req('/api/slots?mine=1'))).status).toBe(401)
  })
})

describe('profile', () => {
  it('is scoped to the session user and keeps one way to be reached', async () => {
    const me = await makeUser('Me')
    await makeUser('NotMe')
    loginAs(me)
    expect((await (await getProfile()).json()).name).toBe('Me')

    const cleared = await patchProfile(req('/api/profile', 'PATCH', { phone: '', contact_viber: '' }))
    expect(cleared.status).toBe(400)

    const updated = await patchProfile(req('/api/profile', 'PATCH', { phone: '', unit_number: '9F' }))
    expect(updated.status).toBe(200)
    expect(await updated.json()).toMatchObject({ unit_number: '9F', phone: null, contact_viber: 'viber-me' })
    const other = (await query<{ unit_number: string }>(`SELECT unit_number FROM user_profiles WHERE name = 'NotMe'`)).rows[0]
    expect(other.unit_number).toBe('12B')
  })

  it('changes the password only with the current one', async () => {
    const me = await makeUser('Pat')
    loginAs(me)
    const wrong = await patchProfile(req('/api/profile', 'PATCH', { current_password: 'nope', new_password: 'another long password' }))
    expect(wrong.status).toBe(400)
    const right = await patchProfile(
      req('/api/profile', 'PATCH', { current_password: 'correct horse battery', new_password: 'another long password' })
    )
    expect(right.status).toBe(200)
    expect(await verifyCredentials('pat@example.test', 'another long password')).not.toBeNull()
  })

  it('requires a login', async () => {
    loginAs(null)
    expect((await getProfile()).status).toBe(401)
  })
})

describe('feedback', () => {
  it('stores it without query strings or fragments, and drops honeypot posts', async () => {
    const response = await sendFeedback(req('/api/feedback', 'POST', { kind: 'idea', message: ' Add a map ', page: '/LMR/slots?x=1#y' }))
    expect(response.status).toBe(201)
    expect((await sendFeedback(req('/api/feedback', 'POST', { message: 'spam', website: 'x' }))).status).toBe(201)
    expect((await sendFeedback(req('/api/feedback', 'POST', { message: '  ' }))).status).toBe(400)

    const rows = (await query('SELECT kind, message, page FROM feedback')).rows
    expect(rows).toEqual([{ kind: 'idea', message: 'Add a map', page: '/LMR/slots' }])
  })
})

describe('database', () => {
  it('refuses a profile with neither phone nor Viber', async () => {
    await expect(
      query(`INSERT INTO user_profiles (email, password_hash, name, unit_number) VALUES ('z@z', 'h', 'Z', '1')`)
    ).rejects.toThrow(/phone_or_viber/)
  })
})

describe("residents' code (SIGNUP_INVITE_CODE)", () => {
  const body = { email: 'r@example.test', password: 'a long enough password', name: 'R', unit_number: '3', phone: '1' }

  it('is not needed when unset', async () => {
    delete process.env.SIGNUP_INVITE_CODE
    expect((await signup(req('/api/auth/signup', 'POST', body))).status).toBe(201)
  })

  it('is required when set, ignoring case and spaces', async () => {
    process.env.SIGNUP_INVITE_CODE = 'Lumiere-2026'
    try {
      expect((await signup(req('/api/auth/signup', 'POST', body))).status).toBe(403)
      expect((await signup(req('/api/auth/signup', 'POST', { ...body, invite_code: 'guess' }))).status).toBe(403)
      expect((await query('SELECT 1 FROM user_profiles')).rows).toHaveLength(0)
      const ok = await signup(req('/api/auth/signup', 'POST', { ...body, invite_code: ' lumiere-2026 ' }))
      expect(ok.status).toBe(201)
    } finally {
      delete process.env.SIGNUP_INVITE_CODE
    }
  })
})
