/** `datetime-local` speaks local wall-clock time with no zone; the API speaks ISO-8601. */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000

  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString()
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now()
}
