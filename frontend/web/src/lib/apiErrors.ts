function messages(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((item): item is string => typeof item === 'string' && !!item.trim())
    .map((item) => item.trim());
}

export function getApiErrorMessages(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as { errors?: unknown; message?: unknown };
  const errors = messages(record.errors);
  return [...new Set(errors.length ? errors : messages(record.message))];
}

export function getApiErrorMessage(payload: unknown, fallback = 'Yêu cầu thất bại.'): string {
  return getApiErrorMessages(payload).join(' · ') || fallback;
}
