// POST /api/feedback - the "Feedback" button on every page. Anyone may send.
//
// Stored in the feedback table. If FEEDBACK_WEBHOOK_URL is set (a Discord
// channel webhook), a copy is posted there too; that is best-effort and never
// fails the request. "website" is a honeypot: bots that fill it get a 201 and
// nothing is stored.

import { query } from '@/lib/db/client'
import { allow, clientIp, HOUR } from '@/lib/rate-limit'
import { FeedbackSchema, firstError } from '@/lib/validation/api-schemas'
import { currentUserId, error, json, readJson } from '@/lib/api'

async function notify(kind: string, message: string, contact: string | null, page: string | null) {
  const url = process.env.FEEDBACK_WEBHOOK_URL
  if (!url) return
  const content = [
    `**ParkBoard feedback** (${kind})${page ? ` on \`${page}\`` : ''}`,
    message,
    contact ? `Contact: ${contact}` : 'No contact left',
  ].join('\n')
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // allowed_mentions: user text must never ping @everyone.
      body: JSON.stringify({ content: content.slice(0, 1900), allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(3000),
    })
  } catch (err) {
    console.error('[feedback] webhook failed:', err instanceof Error ? err.message : err)
  }
}

export async function POST(request: Request) {
  const body = await readJson(request)
  if (body === null) return error('Invalid request body', 400)
  if ((body as Record<string, unknown>).website) return json({ ok: true }, 201)

  const parsed = FeedbackSchema.safeParse(body)
  if (!parsed.success) return error(firstError(parsed.error), 400)

  if (!(await allow(`feedback:${clientIp(request.headers)}`, 5, HOUR))) {
    return error('Thanks! That is a lot of feedback for one hour. Please try again later.', 429)
  }

  const { kind, message, contact, page } = parsed.data
  const userId = await currentUserId()
  await query(
    `INSERT INTO feedback (kind, message, contact, page, user_agent, user_id) VALUES ($1, $2, $3, $4, $5, $6)`,
    [kind, message, contact, page, request.headers.get('user-agent')?.slice(0, 300) ?? null, userId]
  )
  await notify(kind, message, contact, page)
  return json({ ok: true }, 201)
}
