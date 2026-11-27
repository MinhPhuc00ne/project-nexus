import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestTraceState {
  traceId: string;
}

const requestTraceStorage = new AsyncLocalStorage<RequestTraceState>();

export function runWithRequestTrace<T>(traceId: string, fn: () => T): T {
  return requestTraceStorage.run({ traceId }, fn);
}

export function getCurrentTraceId(): string | undefined {
  return requestTraceStorage.getStore()?.traceId;
}
