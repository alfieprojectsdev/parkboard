import { describe, expect, it } from 'vitest'
import { DEFAULT_REDIRECT, safeRedirect } from '@/lib/safe-redirect'

const ORIGIN = 'https://parkboard.test'
const BACKSLASH = String.fromCharCode(92)

describe('safeRedirect', () => {
  it('keeps same-site paths, with their query and fragment', () => {
    expect(safeRedirect('/LMR/slots/abc', ORIGIN)).toBe('/LMR/slots/abc')
    expect(safeRedirect('/profile?tab=1#top', ORIGIN)).toBe('/profile?tab=1#top')
  })

  it('falls back when there is no redirect or it is not a path', () => {
    expect(safeRedirect(null, ORIGIN)).toBe(DEFAULT_REDIRECT)
    expect(safeRedirect('', ORIGIN)).toBe(DEFAULT_REDIRECT)
    expect(safeRedirect('https://evil.example', ORIGIN)).toBe(DEFAULT_REDIRECT)
    expect(safeRedirect('javascript:alert(1)', ORIGIN)).toBe(DEFAULT_REDIRECT)
  })

  it('refuses paths that browsers resolve to another site', () => {
    for (const value of ['//evil.example', `/${BACKSLASH}evil.example`, `/${BACKSLASH}/evil.example`, '/\t/evil.example']) {
      expect(safeRedirect(value, ORIGIN), JSON.stringify(value)).toBe(DEFAULT_REDIRECT)
    }
  })
})
