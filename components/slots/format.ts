// Date helpers for slot windows. Residents are in Manila; formatting uses the
// browser's own time zone, which is what they typed into the form.

const dateTime = new Intl.DateTimeFormat('en-PH', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export const formatWhen = (iso: string) => dateTime.format(new Date(iso))

/** ISO timestamp -> value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value (local time) -> ISO timestamp. */
export const fromLocalInput = (value: string) => new Date(value).toISOString()
