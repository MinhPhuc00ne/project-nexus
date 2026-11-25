// datetime-local inputs use minute precision and the device's timezone.
export function minEndDateTime(start: string | null): string | undefined {
  if (!start) return undefined;
  const date = new Date(start);
  if (!Number.isFinite(date.getTime())) return undefined;
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
