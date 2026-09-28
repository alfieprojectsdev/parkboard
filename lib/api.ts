// lib/api.ts
// Small helpers shared by the route handlers.

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export const error = (message: string, status: number) => json({ error: message }, status)

/** The logged-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id || null
}

/** Parsed JSON body, or null if the body is not valid JSON. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
