import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestTraceState {
  traceId: string;
}

const requestTraceStorage = new AsyncLocalStorage<RequestTraceState>();

const MAX_TRACE_ID_LENGTH = 128;

export function runWithRequestTrace<T>(traceId: string, fn: () => T): T {
  return requestTraceStorage.run({ traceId }, fn);
}

export function getCurrentTraceId(): string | undefined {
  return requestTraceStorage.getStore()?.traceId;
}

export function sanitizeTraceId(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const cleaned = raw.replace(/[\r\n]+/g, '').trim();
  if (!cleaned) {
    return undefined;
  }
  return cleaned.slice(0, MAX_TRACE_ID_LENGTH);
}

export function resolveHeaderTraceId(
  headers?: Record<string, string | string[] | undefined>,
): string | undefined {
  if (!headers) {
    return undefined;
  }
  return sanitizeTraceId(headers['x-request-id']) ?? sanitizeTraceId(headers['x-trace-id']);
}
