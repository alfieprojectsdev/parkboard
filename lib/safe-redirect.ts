// Where to send someone after login, from the ?redirect= parameter.
//
// Only same-site paths. The value is resolved the way the browser will
// resolve it, because prefix checks miss /\evil.example and /<tab>/evil.example,
// which both land on https://evil.example.

export const DEFAULT_REDIRECT = '/LMR/slots'

export function safeRedirect(value: string | null, origin: string): string {
  if (!value?.startsWith('/')) return DEFAULT_REDIRECT
  const url = new URL(value, origin)
  return url.origin === origin ? url.pathname + url.search + url.hash : DEFAULT_REDIRECT
}
